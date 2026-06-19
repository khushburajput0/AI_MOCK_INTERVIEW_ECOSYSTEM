from fastapi import APIRouter
from app.schemas.profile_schema import ProfileOut

router = APIRouter()

@router.get("/{user_id}", response_model=ProfileOut)
async def get_profile(user_id: int):
    return {"id": 1, "user_id": user_id, "bio": "This is a bio"}
