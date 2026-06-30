from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.profile_schema import ProfileOut, ProfileStats
from app.core.database import get_db
from app.dependencies.get_current_user import get_current_user
from app.models.email_verification import EmailVerification
from app.models.interview import FutureInterview, Interview
from app.models.password_reset_token import PasswordResetToken
from app.models.profile import Profile
from app.models.qa import Answer, Feedback, Question
from app.models.user import User
from app.repository.interview_repository import (
    count_completed_interviews,
    average_score,
    best_score,
    latest_future_interview,
    latest_completed_interview,
)

router = APIRouter()


def delete_user_identity(db: Session, user_id: int) -> None:
    interview_ids = [
        row[0] for row in db.query(Interview.id).filter(Interview.user_id == user_id).all()
    ]

    if interview_ids:
        db.query(Answer).filter(Answer.interview_id.in_(interview_ids)).delete(synchronize_session=False)
        db.query(Feedback).filter(Feedback.interview_id.in_(interview_ids)).delete(synchronize_session=False)
        db.query(Question).filter(Question.interview_id.in_(interview_ids)).delete(synchronize_session=False)

    db.query(Interview).filter(Interview.user_id == user_id).delete(synchronize_session=False)
    db.query(FutureInterview).filter(FutureInterview.user_id == user_id).delete(synchronize_session=False)
    db.query(Profile).filter(Profile.user_id == user_id).delete(synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete(synchronize_session=False)
    db.query(EmailVerification).filter(EmailVerification.user_id == user_id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()


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


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    delete_user_identity(db, current_user.id)
    return
