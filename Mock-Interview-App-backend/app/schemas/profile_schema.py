from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    bio: str


class ProfileStats(BaseModel):
    full_name: str
    email: str
    total_mock_interviews: int
    average_score: float | None
    best_score: float | None
    account_created_at: datetime
    latest_future_interview: datetime | None
