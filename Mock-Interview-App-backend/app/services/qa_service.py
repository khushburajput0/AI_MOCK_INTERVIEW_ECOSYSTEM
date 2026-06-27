from typing import List
import json
import re
import logging
import time

from app.repository.qa_repository import create_questions_for_interview
from app.utils.gemini_client import GeminiAPIError, GeminiClient
from app.core.config import settings
from app.repository.qa_repository import list_questions_for_interview
from app.repository.qa_repository import save_answer
from app.repository.qa_repository import save_feedback as repo_save_feedback

logger = logging.getLogger(__name__)

_GEMINI_QUOTA_COOLDOWN_SECONDS = 60
_gemini_quota_blocked_until = 0.0
_last_generation_source = "unknown"
_last_generation_error = None


class QuestionGenerationError(RuntimeError):
    def __init__(self, detail: str, status_code: int = 502):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


def get_last_generation_status() -> dict:
    return {
        "source": _last_generation_source,
        "error": _last_generation_error,
    }


def build_prompt_for_questions(job_role: str, job_description: str, years_experience: int) -> str:
    return (
        "Based on the following candidate information:\n\n"
        f"- Job Position: {job_role}\n"
        f"- Job Description / Skills: {job_description}\n"
        f"- Years of Experience: {years_experience}\n\n"
        "Generate 5 technical interview questions along with detailed answers.\n"
        "Return the response in valid JSON only using the following structure:\n\n"
        "{\n"
        '  "questions": [\n'
        "    {\n"
        '      "question": "Interview question here",\n'
        '      "answer": "Detailed answer here"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Requirements:\n"
        "- Include exactly 5 questions.\n"
        f"- Questions should match a {job_role} with {years_experience} years of experience.\n"
        f"- Cover the listed skills and responsibilities: {job_description}.\n"
        "- Cover role-specific technical depth, system design, and best practices.\n"
        "- Answers should be concise but technically accurate, about 2 to 4 sentences each.\n"
        "- Return only valid JSON without any additional text or markdown."
    )


def _gemini_api_key() -> str | None:
    return getattr(settings, "GOOGLE_API_KEY", None) or getattr(settings, "GEMINI_API_KEY", None)


def _fallback_questions(job_role: str, job_description: str, years_experience: int) -> list[dict]:
    yrs = f" with {years_experience} years experience" if years_experience else ""
    role = job_role or "the role"
    stack = job_description or "the relevant tech stack"
    return [
        {
            "prompt": f"Tell me about your overall experience working as a {role}{yrs}, especially with {stack}.",
            "meta": {"answer": f"A strong answer should summarize relevant {role} experience, name the most important tools from {stack}, explain ownership level, and include one measurable project outcome."},
        },
        {
            "prompt": f"Describe a challenging project you built as a {role}{yrs} using {stack}. What was your role and outcome?",
            "meta": {"answer": "A detailed answer should cover the problem, architecture or implementation choices, trade-offs, blockers, debugging steps, collaboration, and the final business or technical impact."},
        },
        {
            "prompt": f"How do you design systems or pipelines related to {stack}? Walk through your approach and trade-offs.",
            "meta": {"answer": "A good response should start with requirements, data flow, API or module boundaries, storage choices, failure modes, scalability, security, observability, and how trade-offs are validated."},
        },
        {
            "prompt": f"Explain a technical problem you faced in a {role}{yrs} role and how you debugged or solved it.",
            "meta": {"answer": "The answer should show a clear debugging process: reproduce the issue, isolate variables, inspect logs or metrics, test hypotheses, implement the fix, and prevent regression."},
        },
        {
            "prompt": f"How do you measure success and impact for work you do as a {role}{yrs}? Give examples.",
            "meta": {"answer": "A strong answer connects engineering work to metrics such as latency, reliability, conversion, maintainability, delivery speed, cost, or user satisfaction, with concrete before-and-after examples."},
        },
    ]


def _mark_questions_source(items: list[dict], source: str, error: str | None = None) -> list[dict]:
    for item in items:
        meta = item.get("meta") if isinstance(item.get("meta"), dict) else {}
        meta["source"] = source
        if error:
            meta["generation_error"] = error
        item["meta"] = meta
    return items


def _parse_model_json_text(text: str):
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    for pattern in (r"(\[\s*\{.*\}\s*\])", r"(\{\s*.*\s*\})"):
        match = re.search(pattern, cleaned, re.S)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                continue

    return None


def _normalize_question_item(item) -> dict | None:
    if isinstance(item, str):
        prompt = item.strip()
        if not prompt or prompt in {"[", "]", "{", "}", "},", "},"}:
            return None
        if prompt.startswith(('"prompt"', '"question"', '"answer"', '"questions"')):
            return None
        return {"prompt": prompt} if prompt else None

    if not isinstance(item, dict):
        return None

    prompt = (
        item.get("prompt")
        or item.get("question")
        or item.get("Question")
        or item.get("QUESTION")
        or item.get("question_text")
        or item.get("QuestionText")
    )
    if not prompt:
        return None

    answer = (
        item.get("answer")
        or item.get("answered")
        or item.get("Answered")
        or item.get("ANSWER")
        or item.get("sample_answer")
        or item.get("expected_answer")
    )

    meta = item.get("meta") if isinstance(item.get("meta"), dict) else {}
    if answer and "answer" not in meta:
        meta["answer"] = answer

    return {"prompt": str(prompt), "meta": meta or None}


def _normalize_questions_response(res) -> list[dict] | None:
    data = None
    if isinstance(res, (list, tuple)):
        data = list(res)
    elif isinstance(res, dict):
        for key in ("items", "questions", "Questions", "results", "data"):
            if isinstance(res.get(key), list):
                data = res[key]
                break
        if data is None:
            data = [res]
    elif isinstance(res, str):
        parsed = _parse_model_json_text(res)
        if isinstance(parsed, list):
            data = parsed
        elif isinstance(parsed, dict):
            for key in ("items", "questions", "Questions", "results", "data"):
                if isinstance(parsed.get(key), list):
                    data = parsed[key]
                    break
            if data is None:
                data = [parsed]
        else:
            stripped = res.strip()
            if stripped.startswith(("{", "[")):
                return None
            lines = [line.strip() for line in res.splitlines() if line.strip()]
            if len(lines) > 1:
                data = lines[:5]

    if not isinstance(data, list):
        return None

    normalized = []
    for item in data:
        question = _normalize_question_item(item)
        if question:
            normalized.append(question)

    if len(normalized) < 5:
        return None

    return normalized[:5]


def generate_questions_with_model(client, job_role: str, job_description: str, years_experience: int, raw_prompt: str | None = None) -> List[dict]:
    global _gemini_quota_blocked_until, _last_generation_source, _last_generation_error

    # If caller provided a raw prompt (for example from UI or OCR), use it directly.
    prompt = raw_prompt if raw_prompt else build_prompt_for_questions(job_role, job_description, years_experience)
    api_key = _gemini_api_key()
    data = None
    _last_generation_source = "unknown"
    _last_generation_error = None

    if api_key and time.monotonic() < _gemini_quota_blocked_until:
        error = "Gemini quota cooldown is active after a previous rate-limit response"
        logger.warning("Skipping Gemini question generation while quota cooldown is active")
        _last_generation_source = "fallback"
        _last_generation_error = error
        return _mark_questions_source(_fallback_questions(job_role, job_description, years_experience), "fallback", error)

    # client is a callable or object wrapping Gemini API. Try to call client.generate()
    try:
        if client is None:
            # try to construct client from settings (loads .env)
            if api_key:
                client = GeminiClient(api_key=api_key)
            else:
                client = None

        res = client.generate(prompt) if client else None

        data = _normalize_questions_response(res)
        if api_key and not data:
            _last_generation_error = f"Gemini returned no usable JSON. Raw response preview: {str(res)[:500]!r}"
            logger.warning("Gemini returned no usable interview questions. Raw response preview: %r", str(res)[:500])
    except Exception as e:
        logger.exception("Gemini question generation failed: %s", e)
        if isinstance(e, GeminiAPIError) and e.status_code == 429:
            retry_after = e.retry_after or _GEMINI_QUOTA_COOLDOWN_SECONDS
            _gemini_quota_blocked_until = time.monotonic() + max(retry_after, _GEMINI_QUOTA_COOLDOWN_SECONDS)
            _last_generation_source = "fallback"
            _last_generation_error = str(e)
            return _mark_questions_source(_fallback_questions(job_role, job_description, years_experience), "fallback", str(e))
        if api_key:
            status_code = e.status_code if isinstance(e, GeminiAPIError) else 502
            detail = e.detail if isinstance(e, GeminiAPIError) else str(e)
            raise QuestionGenerationError(detail, status_code=status_code) from e
        data = None

    # Ensure we always return a list of prompt dicts. If model didn't provide usable output,
    # generate varied fallback prompts so the interview flow can continue.
    if not data or not isinstance(data, list) or len(data) == 0:
        _last_generation_source = "fallback"
        data = _mark_questions_source(_fallback_questions(job_role, job_description, years_experience), "fallback", _last_generation_error)
    else:
        _last_generation_source = "gemini" if api_key else "fallback"
        data = _mark_questions_source(data, _last_generation_source)

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
            "You are an expert technical interviewer.\n"
            f"Question:\n{q.prompt}\n\n"
            f"Candidate answer:\n{user_text}\n\n"
            'Rate this answer on a 0-100 scale and provide a concise feedback comment. Return JSON object: {"score": number, "feedback": "text"}'
        )

        score = None
        feedback_text = ""
        try:
            if client is None:
                api_key = _gemini_api_key()
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
