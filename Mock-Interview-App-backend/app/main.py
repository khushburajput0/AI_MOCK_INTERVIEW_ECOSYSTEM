from fastapi import FastAPI
import logging

from app.routers import auth_router, profile_router, interview_router
from app.core.database import engine, Base, get_engine

logger = logging.getLogger(__name__)

app = FastAPI(title="Mock Interview App Backend")

app.include_router(auth_router.router, prefix="/auth")
app.include_router(profile_router.router, prefix="/profiles")
app.include_router(interview_router.router, prefix="/interviews")


@app.on_event("startup")
async def startup_event():
    eng = get_engine()
    try:
        with eng.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        # Import model modules so they register their tables on Base.metadata
        from app.models import user as _user_module
        from app.models import profile as _profile_module
        from app.models import interview as _interview_module

        Base.metadata.create_all(bind=eng)
        logger.info("Database connected and tables ensured.")
    except Exception as exc:
        logger.exception("Failed to connect to the database on startup: %s", exc)
        raise


@app.on_event("shutdown")
async def shutdown_event():
    try:
        eng = get_engine()
        eng.dispose()
        logger.info("Database engine disposed.")
    except Exception:
        logger.exception("Error disposing database engine")


@app.get("/")
async def root():
    return {"message": "Mock Interview App Backend is up"}
