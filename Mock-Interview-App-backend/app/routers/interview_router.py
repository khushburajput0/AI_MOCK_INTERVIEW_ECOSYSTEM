from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.interview_schema import InterviewOut, InterviewCreate
from app.core.database import get_db
from app.dependencies.get_current_user import get_current_user
from app.repository.interview_repository import create_interview, list_interviews_by_user, get_interview as repo_get_interview
from app.services.qa_service import create_and_store_questions
from pydantic import BaseModel

router = APIRouter()


@router.post("/", response_model=InterviewOut)
def create_interview_endpoint(payload: InterviewCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    created = create_interview(
        db,
        user_id=current_user.id,
        title=payload.title,
        scheduled_at=payload.scheduled_at,
        job_role=payload.job_role,
        job_description=payload.job_description,
        years_experience=payload.years_experience,
    )
    return created


@router.get("/", response_model=list[InterviewOut])
def list_my_interviews(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    items = list_interviews_by_user(db, current_user.id)
    return items


@router.get("/{interview_id}", response_model=InterviewOut)
def get_interview_endpoint(interview_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = repo_get_interview(db, interview_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if item.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this interview")
    return item


class GenerateRequest(BaseModel):
    raw_prompt: str | None = None


@router.post("/{interview_id}/generate", response_model=list)
def generate_questions_endpoint(interview_id: int, payload: GenerateRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # verify interview exists and belongs to current user
    item = repo_get_interview(db, interview_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    if item.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this interview")

    # call the QA service to generate and persist questions
    # Use GEMINI client from settings inside the service
    created = create_and_store_questions(db, None, interview_id, item.job_role, item.job_description, item.years_experience, raw_prompt=payload.raw_prompt)
    return [ {"id": q.id, "prompt": q.prompt, "meta": q.meta} for q in created ]
