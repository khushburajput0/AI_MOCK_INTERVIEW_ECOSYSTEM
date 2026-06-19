from pydantic import BaseModel


class ProfileOut(BaseModel):
    id: int
    user_id: int
    bio: str

    class Config:
        orm_mode = True
