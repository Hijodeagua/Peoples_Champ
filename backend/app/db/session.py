from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from ..core.config import settings

# Create engine using settings from config
# Only use check_same_thread for SQLite, not PostgreSQL
if settings.is_postgres:
    engine = create_engine(settings.database_url)
else:
    # SQLite fallback for local development
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency helper you will use in FastAPI routes later
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
