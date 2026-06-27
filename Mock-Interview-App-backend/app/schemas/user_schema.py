from pydantic import BaseModel, ConfigDict, EmailStr


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
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    expires_in_minutes: int
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
