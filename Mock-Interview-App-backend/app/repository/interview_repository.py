from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.models.interview import Interview, FutureInterview


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
# TODO: implement interview repository
