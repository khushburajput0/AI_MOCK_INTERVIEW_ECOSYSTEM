from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.user_schema import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    UserCreate,
    UserOut,
    UserLogin,
)
from app.schemas.token_schema import Token
from app.core.database import get_db
from app.services import auth_service
from app.dependencies.get_current_user import get_current_user, oauth2_scheme
from app.repository.token_repository import revoke_token

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = auth_service.authenticate_user(db, user.email, user.password)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    created = auth_service.register_user(db, user.full_name, user.email, user.target_role, user.password)
    return {
        "id": created.id,
        "full_name": created.full_name,
        "email": created.email,
        "target_role": created.target_role,
    }


@router.post("/login", response_model=Token)
def login(form_data: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = auth_service.create_token_for_user(user)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.create_password_reset_for_email(db, payload.email)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    updated = auth_service.reset_password_with_token(db, payload.token, payload.new_password)
    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    return {"message": "Password reset successfully"}



@router.post("/logout", status_code=204)
def logout(token: str = Depends(oauth2_scheme), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout the current user by revoking the presented token.

    The endpoint stores the token in a revocation table so it can no longer be used.
    """
    if not token:
        return

    revoke_token(db, token)
    return
