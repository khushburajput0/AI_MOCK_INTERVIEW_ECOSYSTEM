from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    target_role = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean(), default=True)
    is_email_verified = Column(Boolean(), default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
