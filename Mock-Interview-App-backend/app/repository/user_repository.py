from sqlalchemy.orm import Session
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
	return db.query(User).filter(User.email == email).first()


def create_user(db: Session, full_name: str | None, email: str, target_role: str | None, hashed_password: str) -> User:
	user = User(full_name=full_name, email=email, target_role=target_role, hashed_password=hashed_password)
	db.add(user)
	db.commit()
	db.refresh(user)
	return user
