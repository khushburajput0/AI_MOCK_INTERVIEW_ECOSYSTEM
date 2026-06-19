from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    full_name: str | None = None
    email: EmailStr
    target_role: str | None = None
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str | None = None
    email: EmailStr
    target_role: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    class Config:
        orm_mode = True
