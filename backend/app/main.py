from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import auth, daily_set, game, players

app = FastAPI(title="Peoples Champ API")

# --- CORS setup so the React frontend (localhost:5173) can call the API ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------------------------------


@app.get("/", tags=["health"])
def read_root():
    return {"status": "ok"}


app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(daily_set.router, prefix="/daily-set", tags=["daily-set"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(game.router)
