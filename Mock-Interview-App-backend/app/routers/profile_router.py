from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.profile_schema import ProfileOut, ProfileStats
from app.core.database import get_db
from app.dependencies.get_current_user import get_current_user
from app.repository.interview_repository import (
    count_completed_interviews,
    average_score,
    best_score,
    latest_future_interview,
    latest_completed_interview,
)

router = APIRouter()


@router.get("/me", response_model=ProfileStats)
def get_my_profile(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user = current_user
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total = count_completed_interviews(db, user.id)
    avg = average_score(db, user.id)
    best = best_score(db, user.id)
    latest_completed = latest_completed_interview(db, user.id)
    upcoming = latest_future_interview(db, user.id)

    return {
        "full_name": user.full_name,
        "email": user.email,
        "total_mock_interviews": total,
        "average_score": avg,
        "best_score": best,
        "account_created_at": user.created_at,
        "latest_future_interview": upcoming,
        "latest_completed_interview": latest_completed,
    }
