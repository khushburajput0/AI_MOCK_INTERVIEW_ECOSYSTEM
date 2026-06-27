from datetime import datetime

from sqlalchemy.orm import Session

from app.models.email_verification import EmailVerification


def create_email_verification(db: Session, user_id: int, otp_hash: str, expires_at: datetime) -> EmailVerification:
    verification = EmailVerification(user_id=user_id, otp_hash=otp_hash, expires_at=expires_at)
    db.add(verification)
    db.commit()
    db.refresh(verification)
    return verification


def get_latest_active_verification(db: Session, user_id: int) -> EmailVerification | None:
    return (
        db.query(EmailVerification)
        .filter(EmailVerification.user_id == user_id, EmailVerification.is_used.is_(False))
        .order_by(EmailVerification.created_at.desc())
        .first()
    )


def mark_verification_used(db: Session, verification: EmailVerification) -> EmailVerification:
    verification.is_used = True
    db.add(verification)
    db.commit()
    db.refresh(verification)
    return verification


def expire_active_verifications(db: Session, user_id: int) -> None:
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user_id,
        EmailVerification.is_used.is_(False),
    ).update({"is_used": True})
    db.commit()
