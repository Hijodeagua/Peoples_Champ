"""
Load all-time players from CSV for the all-time ranking feature.
Uses career stats from all_time_careers.csv.
"""
import csv
import os
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class AllTimePlayer:
    id: str  # Basketball Reference ID (e.g., "jordami01")
    name: str
    position: Optional[str]
    team: str  # Teams played for
    career_ws: float  # Career Win Shares
    career_from: str  # Career start year
    career_to: str  # Career end year
    games: int
    points: int
    

def load_all_time_players() -> List[AllTimePlayer]:
    """
    Load all-time players from CSV file.
    Returns players sorted by career win shares (best first).
    """
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data",
        "all_time_careers.csv"
    )
    
    players: List[AllTimePlayer] = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                player_id = row.get('Player-additional', '').strip()
                if not player_id:
                    continue
                
                name = row.get('Player', '').strip()
                position = row.get('Pos', '').strip() or None
                team = row.get('Team', '').strip()
                career_from = row.get('From', '').strip()
                career_to = row.get('To', '').strip()
                
                try:
                    career_ws = float(row.get('WS', 0))
                except (ValueError, TypeError):
                    career_ws = 0.0
                
                try:
                    games = int(row.get('G', 0))
                except (ValueError, TypeError):
                    games = 0
                
                try:
                    points = int(row.get('PTS', 0))
                except (ValueError, TypeError):
                    points = 0
                
                players.append(AllTimePlayer(
                    id=player_id,
                    name=name,
                    position=position,
                    team=team,
                    career_ws=career_ws,
                    career_from=career_from,
                    career_to=career_to,
                    games=games,
                    points=points
                ))
    except FileNotFoundError:
        print(f"[AllTime] Warning: Could not find {csv_path}")
        return []
    except Exception as e:
        print(f"[AllTime] Error loading all-time players: {e}")
        return []
    
    # Already sorted by WS in CSV, but ensure it
    players.sort(key=lambda p: p.career_ws, reverse=True)
    print(f"[AllTime] Loaded {len(players)} all-time players")
    return players


def get_all_time_player_ids() -> List[str]:
    """Get list of all-time player IDs."""
    return [p.id for p in get_cached_all_time_players()]


def get_all_time_player_by_id(player_id: str) -> Optional[AllTimePlayer]:
    """Get a specific all-time player by ID."""
    players_dict = get_all_time_players_dict()
    return players_dict.get(player_id)


def get_all_time_players_dict() -> Dict[str, AllTimePlayer]:
    """Get all-time players as a dictionary keyed by ID."""
    return {p.id: p for p in get_cached_all_time_players()}


# Cache the loaded players
_cached_players: Optional[List[AllTimePlayer]] = None


def get_cached_all_time_players() -> List[AllTimePlayer]:
    """Get cached all-time players (loads once)."""
    global _cached_players
    if _cached_players is None:
        _cached_players = load_all_time_players()
    return _cached_players
