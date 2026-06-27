from sqlalchemy.orm import Session
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
	return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
	return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, full_name: str | None, email: str, target_role: str | None, hashed_password: str) -> User:
	user = User(full_name=full_name, email=email, target_role=target_role, hashed_password=hashed_password)
	db.add(user)
	db.commit()
	db.refresh(user)
	return user


def update_user_password(db: Session, user: User, hashed_password: str) -> User:
	user.hashed_password = hashed_password
	db.add(user)
	db.commit()
	db.refresh(user)
	return user
