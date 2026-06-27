import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies.get_current_user import get_current_user
from app.repository.qa_repository import (
    delete_questions_for_interview,
    has_answers_for_interview,
    list_questions_for_interview,
    save_answer,
)
from app.repository.interview_repository import get_interview
from app.services.qa_service import (
    QuestionGenerationError,
    create_and_store_questions,
    get_last_generation_status,
    score_answers_for_interview,
)

router = APIRouter()


class CreateQuestionsPayload(BaseModel):
    interview_id: int
    job_role: str
    job_description: str
    years_experience: int
    force_regenerate: bool = False


class SubmitAnswerPayload(BaseModel):
    interview_id: int
    question_id: int
    user_text: str
    confidence: float | None = None


def _get_user_interview(db: Session, interview_id: int, user):
    interview = get_interview(db, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if interview.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this interview")
    return interview


def _question_response(items):
    response = []
    for q in items:
        item = {"id": q.id, "prompt": q.prompt, "question": q.prompt}
        if q.meta:
            try:
                item["meta"] = json.loads(q.meta)
            except Exception:
                item["meta"] = q.meta
        if isinstance(item.get("meta"), dict) and item["meta"].get("answer"):
            item["answer"] = item["meta"]["answer"]
        response.append(item)
    return response


def _questions_are_malformed(items) -> bool:
    if not items:
        return False

    bad_tokens = {"[", "]", "{", "}", "},", "},"}
    for q in items:
        prompt = (q.prompt or "").strip()
        if prompt in bad_tokens:
            return True
        if prompt.startswith(('"prompt"', '"question"', '"answer"', '"questions"')):
            return True
        if len(prompt) < 12:
            return True

    return False


def _questions_source(items) -> str:
    sources = set()
    for q in items:
        if not q.meta:
            continue
        try:
            meta = json.loads(q.meta)
        except Exception:
            continue
        if isinstance(meta, dict) and meta.get("source"):
            sources.add(meta["source"])
    if "gemini" in sources:
        return "gemini"
    if "fallback" in sources:
        return "fallback"
    return "unknown"


def _generate_response(items, status_info: dict | None = None):
    questions = _question_response(items)
    source = _questions_source(items)
    response = {"created": questions, "questions": questions, "source": source}
    if source == "fallback":
        response["message"] = "These are local fallback questions. To retry Gemini, send force_regenerate=true after fixing the Gemini key/model/quota issue."
    if status_info and status_info.get("error"):
        response["model_error"] = status_info["error"]
    return response


@router.post("/generate")
def generate_questions(payload: CreateQuestionsPayload, db: Session = Depends(get_db), user=Depends(get_current_user)):
    interview = _get_user_interview(db, payload.interview_id, user)
    existing = list_questions_for_interview(db, interview.id)
    malformed_existing = _questions_are_malformed(existing)
    if existing and not payload.force_regenerate and not malformed_existing:
        return _generate_response(existing)
    if existing and has_answers_for_interview(db, interview.id):
        return _generate_response(existing)
    if existing:
        delete_questions_for_interview(db, interview.id)

    try:
        created = create_and_store_questions(
            db,
            client=None,
            interview_id=interview.id,
            job_role=payload.job_role or interview.job_role or interview.title,
            job_description=payload.job_description or interview.job_description or "",
            years_experience=payload.years_experience or interview.years_experience or 0,
        )
    except QuestionGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return _generate_response(created, get_last_generation_status())


@router.get("/interview/{interview_id}")
def list_questions(interview_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _get_user_interview(db, interview_id, user)
    items = list_questions_for_interview(db, interview_id)
    return _question_response(items)


@router.post("/answer")
def submit_answer(payload: SubmitAnswerPayload, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _get_user_interview(db, payload.interview_id, user)
    question_ids = {q.id for q in list_questions_for_interview(db, payload.interview_id)}
    if payload.question_id not in question_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found for this interview")
    ans = save_answer(db, payload.interview_id, payload.question_id, payload.user_text, payload.confidence)
    return {"id": ans.id}


@router.post("/finalize/{interview_id}")
def finalize_interview(interview_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    _get_user_interview(db, interview_id, user)
    # Compute scores using the model client via qa_service
    # score_answers_for_interview will persist per-question feedback and return a summary
    client = None
    result = score_answers_for_interview(db, client, interview_id)
    return result
