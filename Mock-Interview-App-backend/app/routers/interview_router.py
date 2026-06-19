from fastapi import APIRouter
from app.schemas.interview_schema import InterviewOut, InterviewCreate

router = APIRouter()

@router.post("/", response_model=InterviewOut)
async def create_interview(payload: InterviewCreate):
    return {"id": 1, "user_id": 1, "title": payload.title, "scheduled_at": payload.scheduled_at}

@router.get("/{id}", response_model=InterviewOut)
async def get_interview(id: int):
    return {"id": id, "user_id": 1, "title": "Sample", "scheduled_at": "2020-01-01T00:00:00"}
