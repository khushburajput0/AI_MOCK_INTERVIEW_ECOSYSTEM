from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas.user_schema import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    UserCreate,
    UserOut,
    UserLogin,
)
from app.schemas.user_schema import EmailVerificationRequest, ResendVerificationRequest, UserCreate, UserOut, UserLogin
from app.schemas.token_schema import Token
from app.core.database import get_db
from app.services import auth_service
from app.repository.user_repository import get_user_by_email
from app.dependencies.get_current_user import get_current_user, oauth2_scheme
from app.repository.token_repository import revoke_token
from app.utils.email_sender import EmailDeliveryError

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    try:
        created = auth_service.register_user(db, user.full_name, user.email, user.target_role, user.password)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    try:
        auth_service.send_email_verification_otp(db, created)
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
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
    if not user.is_email_verified:
        try:
            auth_service.send_email_verification_otp(db, user)
        except EmailDeliveryError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email is not verified. A new OTP has been sent.",
        )
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
@router.post("/verify-email", response_model=Token)
def verify_email(payload: EmailVerificationRequest, db: Session = Depends(get_db)):
    user = auth_service.verify_email_otp(db, payload.email, payload.otp)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    token = auth_service.create_token_for_user(user)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/resend-verification-otp")
def resend_verification_otp(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_email_verified:
        return {"message": "Email is already verified"}
    try:
        auth_service.send_email_verification_otp(db, user)
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return {"message": "Verification OTP sent"}



@router.post("/logout", status_code=204)
def logout(token: str = Depends(oauth2_scheme), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout the current user by revoking the presented token.

    The endpoint stores the token in a revocation table so it can no longer be used.
    """
    if not token:
        return

    revoke_token(db, token)
    return
