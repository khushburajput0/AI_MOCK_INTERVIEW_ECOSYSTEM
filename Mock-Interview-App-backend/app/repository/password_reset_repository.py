from datetime import datetime

from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken


def create_password_reset_token(db: Session, user_id: int, token_hash: str, expires_at: datetime) -> PasswordResetToken:
    token = PasswordResetToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


def get_active_password_reset_token(db: Session, token_hash: str) -> PasswordResetToken | None:
    now = datetime.utcnow()
    return (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )


def mark_password_reset_token_used(db: Session, token: PasswordResetToken) -> PasswordResetToken:
    token.used_at = datetime.utcnow()
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


def expire_user_password_reset_tokens(db: Session, user_id: int) -> None:
    now = datetime.utcnow()
    (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == user_id, PasswordResetToken.used_at.is_(None))
        .update({"used_at": now}, synchronize_session=False)
    )
    db.commit()
