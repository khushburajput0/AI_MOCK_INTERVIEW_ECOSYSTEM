from sqlalchemy.orm import Session
from app.models.revoked_token import RevokedToken


def revoke_token(db: Session, token: str) -> RevokedToken:
    rt = RevokedToken(token=token)
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt


def is_token_revoked(db: Session, token: str) -> bool:
    existing = db.query(RevokedToken).filter(RevokedToken.token == token).first()
    return existing is not None
