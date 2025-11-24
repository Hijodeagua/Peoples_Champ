# seed_players_from_csv.py

import csv
from collections import defaultdict
from pathlib import Path

from app.database import SessionLocal
from app import models


CSV_PATH = Path(__file__).parent.parent / "data" / "past_3_11-17.csv"
# That resolves to ../data/past_3_11-17.csv from backend/


def load_players_from_csv():
    players = {}

    # We'll aggregate per Player-additional (bbref ID)
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            player_id = row["Player-additional"]
            if not player_id:
                continue

            ws_str = row.get("WS") or "0"
            try:
                ws = float(ws_str)
            except ValueError:
                ws = 0.0

            age_str = row.get("Age") or None
            age = int(age_str) if age_str and age_str.isdigit() else None

            season = row.get("Season")
            name = row.get("Player") or player_id
            team = row.get("Team") or None
            pos = row.get("Pos") or None

            if player_id not in players:
                players[player_id] = {
                    "name": name,
                    "team": team,
                    "position": pos,
                    "seasons": set(),
                    "total_ws": 0.0,
                    "current_age": age,
                }

            p = players[player_id]
            p["name"] = name  # last one wins, fine
            p["team"] = team
            p["position"] = pos
            if season:
                p["seasons"].add(season)
            p["total_ws"] += ws
            if age is not None:
                if p["current_age"] is None or age > p["current_age"]:
                    p["current_age"] = age

    # Turn sets into counts
    for pid, p in players.items():
        p["seasons_count"] = len(p["seasons"]) if p["seasons"] else 1
        if p["total_ws"] <= 0:
            # ensure some positive rating so the game logic doesn't get weird
            p["total_ws"] = 1.0

    return players


def seed_players():
    db = SessionLocal()

    existing_count = db.query(models.Player).count()
    if existing_count > 0:
        print(f"Already have {existing_count} players in DB, skipping seed.")
        db.close()
        return

    players_data = load_players_from_csv()
    print(f"Seeding {len(players_data)} players from CSV...")

    to_add = []
    for pid, p in players_data.items():
        player = models.Player(
            id=pid,
            name=p["name"],
            team=p["team"],
            position=p["position"],
            seasons=p["seasons_count"],
            current_age=p["current_age"],
            total_ws=p["total_ws"],
            # Optional numeric fields we don't strictly need for the game yet:
            ws_per_game=None,
            threes_per_game=None,
            ast_per_game=None,
            stl_per_game=None,
            trb_per_game=None,
            three_pct=None,
            ft_pct=None,
            ts_pct=None,
            efg_pct=None,
            # Use total_ws as a simple initial/current rating for now
            initial_rating=p["total_ws"],
            current_rating=p["total_ws"],
        )
        to_add.append(player)

    db.add_all(to_add)
    db.commit()
    db.close()

    print("Done seeding players.")


if __name__ == "__main__":
    print(f"Using CSV at: {CSV_PATH}")
    seed_players()
