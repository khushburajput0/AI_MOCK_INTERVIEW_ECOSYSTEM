from datetime import timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.repository.user_repository import get_user_by_email, create_user
from app.core.security import get_password_hash, verify_password
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


def create_token_for_user(user, expires_delta: Optional[timedelta] = None):
	data = {"sub": str(user.id), "email": user.email}
	return create_access_token(data, expires_delta)
