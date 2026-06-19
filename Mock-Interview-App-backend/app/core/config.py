from typing import Optional

try:
    from pydantic_settings import BaseSettings
except Exception:
    try:
        from pydantic import BaseSettings  # type: ignore
    except Exception as exc:
        raise RuntimeError("BaseSettings is not available: " + str(exc))


class Settings(BaseSettings):
    APP_NAME: str = "Mock Interview App"
    SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: Optional[str] = None
    DB_CONNECTION: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()

if settings.DB_CONNECTION:
    settings.DATABASE_URL = settings.DB_CONNECTION
elif not settings.DATABASE_URL:
    settings.DATABASE_URL = "sqlite:///./test.db"
