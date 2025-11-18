from fastapi import FastAPI

from .routes import auth, daily_set, game, players

app = FastAPI(title="Peoples Champ API")


@app.get("/", tags=["health"])
def read_root():
    return {"status": "ok"}


app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(daily_set.router, prefix="/daily-set", tags=["daily-set"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(game.router, prefix="/game", tags=["game"])
