from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    scheduled_at = Column(DateTime, default=datetime.utcnow)
    # Job related details
    job_role = Column(String, nullable=True)
    job_description = Column(String, nullable=True)
    years_experience = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # score of the completed interview (0-100). Nullable for scheduled-only interviews.
    score = Column(Float, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    user = relationship("User")



class FutureInterview(Base):
    __tablename__ = "future_interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String, nullable=True)
    user = relationship("User")
