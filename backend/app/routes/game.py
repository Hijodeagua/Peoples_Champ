from fastapi import APIRouter

router = APIRouter()


@router.get("/state")
def get_game_state():
    return {"state": "not_started"}
