from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies.get_current_user import get_current_user
from app.repository.qa_repository import list_questions_for_interview, save_answer, save_feedback
from app.services.qa_service import create_and_store_questions, score_answers_for_interview

router = APIRouter()


class CreateQuestionsPayload(BaseModel):
    interview_id: int
    job_role: str
    job_description: str
    years_experience: int


class SubmitAnswerPayload(BaseModel):
    interview_id: int
    question_id: int
    user_text: str
    confidence: float | None = None


@router.post("/generate")
def generate_questions(payload: CreateQuestionsPayload, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # For now client is None - implement real model client wiring later
    created = create_and_store_questions(db, client=None, interview_id=payload.interview_id, job_role=payload.job_role, job_description=payload.job_description, years_experience=payload.years_experience)
    return {"created": [ {"id": q.id, "prompt": q.prompt} for q in created ]}


@router.get("/interview/{interview_id}")
def list_questions(interview_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = list_questions_for_interview(db, interview_id)
    return [{"id": q.id, "prompt": q.prompt} for q in items]


@router.post("/answer")
def submit_answer(payload: SubmitAnswerPayload, db: Session = Depends(get_db), user=Depends(get_current_user)):
    ans = save_answer(db, payload.interview_id, payload.question_id, payload.user_text, payload.confidence)
    return {"id": ans.id}


@router.post("/finalize/{interview_id}")
def finalize_interview(interview_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Compute scores using the model client via qa_service
    # score_answers_for_interview will persist per-question feedback and return a summary
    client = None
    result = score_answers_for_interview(db, client, interview_id)
    return result
