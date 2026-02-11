import os
import threading
from contextlib import asynccontextmanager
from logging import getLogger

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables from .env file
load_dotenv()

from .db.base import Base
from .db.session import engine
from .routes import admin, all_time, analysis, auth, daily_set, game, players, voting

logger = getLogger(__name__)


def _get_cors_origins() -> list[str]:
    env_origins = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://whosyurgoat.app",
        "https://www.whosyurgoat.app",
        "https://whosyurgoat.com",
        "https://www.whosyurgoat.com",
        "https://peoples-champ.vercel.app",
        "https://peoples-champ-frontend.onrender.com",
    ]


def _run_heavy_startup(app: FastAPI) -> None:
    from .db.session import SessionLocal
    from .models import DailySet, Player
    from .services.batch_scheduler import BatchScheduler
    from .services.player_loader import load_players_from_csv

    db = SessionLocal()
    try:
        player_count = db.query(Player).count()
        logger.info("Found %s players in database", player_count)

        if player_count == 0:
            logger.info("No players found. Attempting to load from CSV")
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            possible_paths = [
                os.path.join(base_dir, "data", "Bbref_Adv_25-26.csv"),
                os.path.join(base_dir, "..", "data", "Bbref_Adv_25-26.csv"),
                os.path.join(base_dir, "..", "frontend", "public", "data", "Bbref_Adv_25-26.csv"),
                "data/Bbref_Adv_25-26.csv",
            ]

            csv_path = next((path for path in possible_paths if os.path.exists(path)), None)
            if csv_path:
                players_loaded = load_players_from_csv(db, csv_path)
                logger.info("Loaded %s players from %s", len(players_loaded), csv_path)
            else:
                logger.warning("No CSV file found for player data")

        batch_scheduler = BatchScheduler(db)
        status = batch_scheduler.get_schedule_status()
        from datetime import date

        today = date.today()
        today_set = db.query(DailySet).filter(DailySet.date == today).first()

        if status["total_daily_sets"] == 0 or not today_set:
            logger.info("No schedule for today (%s). Generating schedule...", today)
            result = batch_scheduler.generate_next_batch(manual_override=True)
            if result.get("success"):
                logger.info("Generated schedule: %s", result["message"])
            else:
                logger.error("Failed to generate schedule: %s", result.get("error"))
        else:
            logger.info(
                "Schedule exists: %s daily sets, %s days remaining",
                status["total_daily_sets"],
                status["days_remaining"],
            )

        app.state.startup_ready = True
        app.state.startup_error = None
    except Exception as exc:  # pragma: no cover
        db.rollback()
        app.state.startup_ready = False
        app.state.startup_error = str(exc)
        logger.exception("Background startup initialization failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.startup_ready = False
    app.state.startup_error = None

    # Keep DB metadata creation synchronous. This is generally fast and avoids early query failures.
    Base.metadata.create_all(bind=engine)

    startup_thread = threading.Thread(target=_run_heavy_startup, args=(app,), daemon=True)
    startup_thread.start()

    yield


app = FastAPI(title="Who's Yur GOAT API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["health"])
def read_root():
    return {"status": "ok"}


@app.get("/health/live", tags=["health"])
def liveness_check():
    return {"status": "live"}


@app.get("/health/ready", tags=["health"])
def readiness_check():
    if app.state.startup_ready:
        return {"status": "ready"}

    return JSONResponse(
        status_code=503,
        content={
            "status": "starting",
            "error": app.state.startup_error,
        },
    )


app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(daily_set.router, prefix="/daily-set", tags=["daily-set"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(all_time.router, prefix="/all-time", tags=["all-time"])
app.include_router(game.router)
app.include_router(voting.router)
app.include_router(admin.router)
