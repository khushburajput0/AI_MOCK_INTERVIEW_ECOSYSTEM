from datetime import timedelta
from datetime import datetime
from typing import Optional
import secrets

from sqlalchemy.orm import Session

from app.repository.user_repository import get_user_by_email, create_user
from app.repository.email_verification_repository import (
	create_email_verification,
	expire_active_verifications,
	get_latest_active_verification,
	mark_verification_used,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.utils.email_sender import send_verification_email
from app.utils.jwt_handler import create_access_token


def register_user(db: Session, full_name: Optional[str], email: str, target_role: Optional[str], password: str):
	hashed = get_password_hash(password)
	user = create_user(db, full_name, email, target_role, hashed)
	return user


def authenticate_user(db: Session, email: str, password: str):
	user = get_user_by_email(db, email)
	if not user:
		return None
	if not verify_password(password, user.hashed_password):
		return None
	return user


def send_email_verification_otp(db: Session, user: User) -> None:
	otp = f"{secrets.randbelow(1_000_000):06d}"
	otp_hash = get_password_hash(otp)
	expires_at = datetime.utcnow() + timedelta(minutes=settings.EMAIL_OTP_EXPIRE_MINUTES)
	expire_active_verifications(db, user.id)
	create_email_verification(db, user.id, otp_hash, expires_at)
	send_verification_email(user.email, otp)


def verify_email_otp(db: Session, email: str, otp: str) -> User | None:
	user = get_user_by_email(db, email)
	if not user:
		return None
	if user.is_email_verified:
		return user

	verification = get_latest_active_verification(db, user.id)
	if not verification or verification.expires_at < datetime.utcnow():
		return None
	if not verify_password(otp, verification.otp_hash):
		return None

	mark_verification_used(db, verification)
	user.is_email_verified = True
	db.add(user)
	db.commit()
	db.refresh(user)
	return user


def create_token_for_user(user, expires_delta: Optional[timedelta] = None):
	data = {"sub": str(user.id), "email": user.email}
	return create_access_token(data, expires_delta)
