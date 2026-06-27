from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth_router, profile_router, interview_router, qa_router
from app.core.database import engine, Base, get_engine
from app.core.schema_compat import ensure_schema_compat

logger = logging.getLogger(__name__)

app = FastAPI(title="Mock Interview App Backend")

# CORS - allow browser-based clients to make requests (including preflight OPTIONS)
# For development it's common to allow all origins; in production narrow this to your UI origin(s).
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth")
app.include_router(profile_router.router, prefix="/profiles")
app.include_router(interview_router.router, prefix="/interviews")
app.include_router(qa_router.router, prefix="/qa")


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
        from app.models import revoked_token as _revoked_module
        from app.models import password_reset_token as _password_reset_module
        from app.models import qa as _qa_module
        from app.models import email_verification as _email_verification_module

        Base.metadata.create_all(bind=eng)
        ensure_schema_compat(eng)
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
