import json
import os
import sys

# Allow imports like "from app.database import ..."
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Player


def seed_players():
    db = SessionLocal()

    # Load your processed player pool JSON
    path = os.path.join(os.path.dirname(__file__), "..", "data", "player_pool.json")
    path = os.path.abspath(path)

    with open(path, "r", encoding="utf-8") as f:
        players = json.load(f)

    print(f"Seeding {len(players)} players...")

    for p in players:
        # Create a Player object
        player = Player(
            id=p["id"],
            name=p["name"],
            team=p["team"],
            position=p["position"],
            seasons=p["seasons"],
            current_age=p["current_age"],
            total_ws=p["total_ws"],
            ws_per_game=p["ws_per_game"],
            threes_per_game=p["threes_per_game"],
            ast_per_game=p["ast_per_game"],
            stl_per_game=p["stl_per_game"],
            trb_per_game=p["trb_per_game"],
            blk_per_game=p["blk_per_game"],
            pts_per_game=p["pts_per_game"],
            three_pct=p["three_pct"],
            ft_pct=p["ft_pct"],
            ts_pct=p["ts_pct"],
            efg_pct=p["efg_pct"],
            initial_rating=p["initial_rating"],
            current_rating=p["initial_rating"],   # Start equal
        )

        db.merge(player)  # upsert behavior: insert or update existing primary key

    db.commit()
    db.close()

    print("Done. Players seeded into the database.")


if __name__ == "__main__":
    seed_players()
