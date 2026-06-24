from typing import List
import json
import re
import logging

from app.repository.qa_repository import create_questions_for_interview, save_feedback
from app.utils.gemini_client import GeminiClient
from app.core.config import settings
from app.repository.qa_repository import list_questions_for_interview
from app.repository.qa_repository import save_answer
from app.repository.qa_repository import save_feedback as repo_save_feedback

logger = logging.getLogger(__name__)


def build_prompt_for_questions(job_role: str, job_description: str, years_experience: int) -> str:
    example = (
        '[{"prompt": "Question 1 text", "meta": {"type": "behavioral"}}, '
        '{"prompt": "Question 2 text"}]'
    )
    return (
        f"You are an expert technical interviewer. Generate 5 concise interview questions for a candidate applying as {job_role}. "
        f"Job description / tech stack: {job_description}. Years of experience: {years_experience}.\n"
        "Output MUST be a JSON array (no surrounding prose) of objects with a 'prompt' string field and an optional 'meta' object. "
        f"Example output: {example}\n"
        "Keep each question focused, clear, and suitable for live verbal answers."
    )


def generate_questions_with_model(client, job_role: str, job_description: str, years_experience: int, raw_prompt: str | None = None) -> List[dict]:
    # If caller provided a raw prompt (for example from UI or OCR), use it directly.
    prompt = raw_prompt if raw_prompt else build_prompt_for_questions(job_role, job_description, years_experience)
    # client is a callable or object wrapping Gemini API. Try to call client.generate()
    try:
        if client is None:
            # try to construct client from settings (loads .env)
            api_key = getattr(settings, "GEMINI_API_KEY", None)
            if api_key:
                client = GeminiClient(api_key=api_key)
            else:
                client = None

        res = client.generate(prompt) if client else None

        # Normalize model response into a list of prompt dicts.
        data = None
        try:
            if isinstance(res, (list, tuple)):
                data = list(res)
            elif isinstance(res, dict):
                # If model returned a dict with a top-level list under some key, try common keys
                for k in ("items", "questions", "candidates", "results", "data"):
                    if k in res and isinstance(res[k], list):
                        data = res[k]
                        break
                if data is None:
                    # attempt to treat dict as a single question object
                    data = [res]
            elif isinstance(res, str):
                # try to parse JSON directly
                try:
                    parsed = json.loads(res)
                    if isinstance(parsed, list):
                        data = parsed
                    elif isinstance(parsed, dict):
                        # if dict contains a list under any common key
                        for k in ("items", "questions", "candidates", "results", "data"):
                            if k in parsed and isinstance(parsed[k], list):
                                data = parsed[k]
                                break
                        if data is None:
                            data = [parsed]
                except Exception:
                    # try to extract a JSON array substring from the response
                    m = re.search(r"(\[\s*\{.*\}\s*\])", res, re.S)
                    if m:
                        try:
                            data = json.loads(m.group(1))
                        except Exception:
                            data = None
                    if data is None:
                        # fallback to line splitting and heuristics
                        lines = [line.strip() for line in res.splitlines() if line.strip()]
                        if len(lines) >= 5:
                            data = [{"prompt": line} for line in lines[:5]]
                        elif len(lines) > 1:
                            data = [{"prompt": line} for line in lines]
                        else:
                            data = None
        except Exception as e:
            logger.exception("Error normalizing model output: %s", e)
            data = None
    except Exception:
        # If model call or parsing fails, leave data as None — we'll fill robust fallback below
        data = None

    # Ensure we always return a list of prompt dicts. If model didn't provide usable output,
    # generate varied fallback prompts instead of repeating a single template.
    if not data or not isinstance(data, list) or len(data) == 0:
        yrs = f" with {years_experience} years experience" if years_experience else ""
        role = job_role or "the role"
        stack = job_description or "the relevant tech"
        data = [
            {"prompt": f"Tell me about your overall experience working as a {role}{yrs}, especially with {stack}."},
            {"prompt": f"Describe a challenging project you built as a {role}{yrs} using {stack}. What was your role and outcome?"},
            {"prompt": f"How do you design systems or pipelines related to {stack}? Walk through your approach and trade-offs."},
            {"prompt": f"Explain a technical problem you faced in a {role}{yrs} role and how you debugged or solved it."},
            {"prompt": f"How do you measure success and impact for work you do as a {role}{yrs}? Give examples."},
        ]

    return data


def create_and_store_questions(db, client, interview_id: int, job_role: str, job_description: str, years_experience: int, raw_prompt: str | None = None):
    prompts = generate_questions_with_model(client, job_role, job_description, years_experience, raw_prompt=raw_prompt)
    return create_questions_for_interview(db, interview_id, prompts)


def score_answers_for_interview(db, client, interview_id: int):
    """Load answers and questions for interview_id, use the model to score each answer,
    persist feedback rows and return a summary dict.

    The scoring prompt asks the model to grade the user's answer on a 0-100 scale and provide a short feedback comment.
    """
    # fetch questions
    questions = list_questions_for_interview(db, interview_id)

    # fetch answers per question (simple query via SQLAlchemy inline to avoid adding repo function)
    from app.models.qa import Answer
    from app.models.interview import Interview
    from datetime import datetime

    items = []
    total_score = 0.0
    count = 0

    for q in questions:
        ans = db.query(Answer).filter(Answer.question_id == q.id, Answer.interview_id == interview_id).order_by(Answer.id.desc()).first()
        user_text = ans.user_text if ans else ""

        # Build prompt for scoring
        prompt = (
            f"You are an expert technical interviewer.\nQuestion:\n{q.prompt}\n\nCandidate answer:\n{user_text}\n\nRate this answer on a 0-100 scale and provide a concise feedback comment. Return JSON object: { '{"score": number, "feedback": "text"}' }"
        )

        score = None
        feedback_text = ""
        try:
            if client is None:
                api_key = getattr(settings, "GEMINI_API_KEY", None)
                client = GeminiClient(api_key=api_key) if api_key else None

            res = client.generate(prompt) if client else None

            # parse numeric score and feedback from response string
            if isinstance(res, str):
                try:
                    # try JSON
                    parsed = json.loads(res)
                    score = float(parsed.get("score") or parsed.get("rating") or parsed.get("score_value")) if isinstance(parsed, dict) else None
                    feedback_text = parsed.get("feedback") if isinstance(parsed, dict) else str(parsed)
                except Exception:
                    # fallback: try to extract digits for score
                    import re

                    m = re.search(r"(\d{1,3})", res)
                    if m:
                        score = float(m.group(1))
                    feedback_text = res
            else:
                # structured fallback
                feedback_text = str(res)
        except Exception:
            # fallback heuristic scoring
            score = 60.0 if user_text else 20.0
            feedback_text = "Could not evaluate automatically; please check your answer clarity and technical depth."

        if score is None:
            score = 50.0 if user_text else 10.0

        # persist feedback per question
        f = repo_save_feedback(db, interview_id, q.id, float(score), feedback_text)

        items.append({"question_id": q.id, "prompt": q.prompt, "user_text": user_text, "score": f.score, "feedback_text": f.feedback_text})
        total_score += float(f.score)
        count += 1

    overall = (total_score / count) if count else None
    # persist overall interview score and mark completed
    try:
        if overall is not None:
            interview = db.query(Interview).filter(Interview.id == interview_id).first()
            if interview:
                interview.score = float(overall)
                interview.completed_at = datetime.utcnow()
                db.add(interview)
                db.commit()
                db.refresh(interview)
    except Exception:
        # if persisting overall fails, continue and return the computed summary
        pass
    return {"overall_score": overall, "items": items}
