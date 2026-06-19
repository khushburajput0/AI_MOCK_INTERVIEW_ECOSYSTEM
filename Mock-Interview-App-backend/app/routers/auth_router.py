from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.user_schema import UserCreate, UserOut, UserLogin
from app.schemas.token_schema import Token
from app.core.database import get_db
from app.services import auth_service

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
