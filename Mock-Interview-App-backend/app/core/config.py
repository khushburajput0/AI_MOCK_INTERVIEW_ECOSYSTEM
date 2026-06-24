from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    APP_NAME: str = "Mock Interview App"
    SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: Optional[str] = None
    DB_CONNECTION: Optional[str] = None
    # Gemini / LLM config - loaded from .env via BaseSettings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_API_URL: Optional[str] = None


settings = Settings()

if settings.DB_CONNECTION:
    settings.DATABASE_URL = settings.DB_CONNECTION
elif not settings.DATABASE_URL:
    settings.DATABASE_URL = "sqlite:///./test.db"
