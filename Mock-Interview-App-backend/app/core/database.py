from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings


connect_args = {}
if settings.DATABASE_URL and settings.DATABASE_URL.startswith("sqlite"):
	connect_args = {"check_same_thread": False}

def get_engine():
	return create_engine(settings.DATABASE_URL, connect_args=connect_args)

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()
