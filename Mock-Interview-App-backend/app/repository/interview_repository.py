from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.models.interview import Interview, FutureInterview
from app.models.user import User


def count_completed_interviews(db: Session, user_id: int) -> int:
    return db.query(func.count(Interview.id)).filter(Interview.user_id == user_id, Interview.score != None).scalar() or 0


def average_score(db: Session, user_id: int) -> float | None:
    avg = db.query(func.avg(Interview.score)).filter(Interview.user_id == user_id, Interview.score != None).scalar()
    return float(avg) if avg is not None else None


def best_score(db: Session, user_id: int) -> float | None:
    best = db.query(func.max(Interview.score)).filter(Interview.user_id == user_id, Interview.score != None).scalar()
    return float(best) if best is not None else None


def latest_future_interview(db: Session, user_id: int) -> datetime | None:
    row = db.query(FutureInterview).filter(FutureInterview.user_id == user_id).order_by(FutureInterview.scheduled_at.desc()).first()
    return row.scheduled_at if row else None


def latest_completed_interview(db: Session, user_id: int) -> datetime | None:
    row = db.query(Interview).filter(Interview.user_id == user_id, Interview.completed_at != None).order_by(Interview.completed_at.desc()).first()
    return row.completed_at if row else None
# TODO: implement interview repository


def create_interview(db: Session, user_id: int, title: str, scheduled_at: datetime, job_role: str | None = None, job_description: str | None = None, years_experience: int | None = None) -> Interview:
    interview = Interview(
        user_id=user_id,
        title=title,
        scheduled_at=scheduled_at,
        job_role=job_role,
        job_description=job_description,
        years_experience=years_experience,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


def list_interviews_by_user(db: Session, user_id: int) -> list[Interview]:
    return db.query(Interview).filter(Interview.user_id == user_id).order_by(Interview.created_at.desc()).all()


def get_interview(db: Session, interview_id: int) -> Interview | None:
    return db.query(Interview).filter(Interview.id == interview_id).first()
