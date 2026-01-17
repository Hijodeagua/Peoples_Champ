import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # DATABASE_URL from Railway/Neon, fallback to SQLite for local dev
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    openai_api_key: str = ""
    # Environment detection
    environment: str = os.getenv("ENVIRONMENT", "development")

    class Config:
        env_file = ".env"

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")

    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() in ("production", "prod")


settings = Settings()
