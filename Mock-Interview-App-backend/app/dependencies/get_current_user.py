from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.jwt_handler import decode_token
from app.repository.user_repository import get_user_by_email
from app.repository.token_repository import is_token_revoked
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
	try:
		payload = decode_token(token)
		email = payload.get("email")
		if email is None:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
		# reject revoked tokens
		if is_token_revoked(db, token):
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")
	except Exception:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

	user = get_user_by_email(db, email)
	if not user:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
	return user
