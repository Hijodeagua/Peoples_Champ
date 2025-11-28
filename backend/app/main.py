from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from .routes import auth, daily_set, game, players, analysis
from .db.session import engine
from .db.base import Base

app = FastAPI(title="Peoples Champ API")

# --- CORS setup so the React frontend can call the API ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://<replace-with-frontend-domain-after-deploy>",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------------------------------


@app.on_event("startup")
def create_tables():
    """Create database tables on startup"""
    Base.metadata.create_all(bind=engine)


@app.get("/", tags=["health"])
def read_root():
    return {"status": "ok"}


app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(daily_set.router, prefix="/daily-set", tags=["daily-set"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(game.router)
