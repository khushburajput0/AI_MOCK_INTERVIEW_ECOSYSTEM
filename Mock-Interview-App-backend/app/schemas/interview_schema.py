from pydantic import BaseModel
from datetime import datetime


class InterviewCreate(BaseModel):
    title: str
    scheduled_at: datetime


class InterviewOut(BaseModel):
    id: int
    user_id: int
    title: str
    scheduled_at: datetime

    class Config:
        orm_mode = True
