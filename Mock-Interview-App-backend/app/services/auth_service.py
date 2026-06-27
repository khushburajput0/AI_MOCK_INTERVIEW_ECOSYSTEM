from datetime import datetime, timedelta
import hashlib
import secrets
from typing import Optional

from sqlalchemy.orm import Session

from app.repository.password_reset_repository import (
	create_password_reset_token,
	expire_user_password_reset_tokens,
	get_active_password_reset_token,
	mark_password_reset_token_used,
)
from app.repository.user_repository import get_user_by_email, get_user_by_id, create_user, update_user_password
from app.core.security import get_password_hash, verify_password
from app.utils.jwt_handler import create_access_token


PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 30


def _hash_reset_token(token: str) -> str:
	return hashlib.sha256(token.encode("utf-8")).hexdigest()


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


def create_token_for_user(user, expires_delta: Optional[timedelta] = None):
	data = {"sub": str(user.id), "email": user.email}
	return create_access_token(data, expires_delta)


def create_password_reset_for_email(db: Session, email: str) -> dict:
	user = get_user_by_email(db, email)
	response = {
		"message": "If an account exists for this email, a password reset token has been generated.",
		"expires_in_minutes": PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
	}
	if not user:
		return response

	expire_user_password_reset_tokens(db, user.id)
	raw_token = secrets.token_urlsafe(32)
	expires_at = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
	create_password_reset_token(db, user.id, _hash_reset_token(raw_token), expires_at)

	# Development/testing convenience. In production, email this token and omit it from the API response.
	response["reset_token"] = raw_token
	return response


def reset_password_with_token(db: Session, token: str, new_password: str) -> bool:
	reset_token = get_active_password_reset_token(db, _hash_reset_token(token))
	if not reset_token:
		return False

	user = get_user_by_id(db, reset_token.user_id)
	if not user:
		mark_password_reset_token_used(db, reset_token)
		return False

	update_user_password(db, user, get_password_hash(new_password))
	mark_password_reset_token_used(db, reset_token)
	return True
