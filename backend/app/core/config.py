import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # DATABASE_URL from Railway/Neon, fallback to SQLite for local dev
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    openai_api_key: str = ""
    # Environment detection
    environment: str = os.getenv("ENVIRONMENT", "development")
    admin_api_key: str = os.getenv("ADMIN_API_KEY", "")
    enable_debug_endpoints: bool = os.getenv("ENABLE_DEBUG_ENDPOINTS", "false").lower() == "true"

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
