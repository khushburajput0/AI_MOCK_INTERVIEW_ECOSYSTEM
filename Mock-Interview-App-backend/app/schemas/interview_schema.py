from pydantic import BaseModel, ConfigDict
from datetime import datetime


class InterviewCreate(BaseModel):
    title: str
    scheduled_at: datetime


class InterviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    scheduled_at: datetime
