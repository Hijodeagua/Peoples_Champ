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
    rebounds: int  # TRB
    assists: int  # AST
    steals: int  # STL
    blocks: int  # BLK
    fg_pct: float  # FG%
    ts_pct: float  # TS% (True Shooting)
    

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
                    ws_val = row.get('WS', '0').strip() or '0'
                    career_ws = float(ws_val)
                except (ValueError, TypeError):
                    career_ws = 0.0
                
                try:
                    g_val = row.get('G', '0').strip() or '0'
                    games = int(g_val)
                except (ValueError, TypeError):
                    games = 0
                
                try:
                    pts_val = row.get('PTS', '0').strip() or '0'
                    points = int(pts_val)
                except (ValueError, TypeError):
                    points = 0
                
                try:
                    trb_val = row.get('TRB', '0').strip() or '0'
                    rebounds = int(trb_val)
                except (ValueError, TypeError):
                    rebounds = 0
                
                try:
                    ast_val = row.get('AST', '0').strip() or '0'
                    assists = int(ast_val)
                except (ValueError, TypeError):
                    assists = 0
                
                try:
                    stl_val = row.get('STL', '0').strip() or '0'
                    steals = int(stl_val)
                except (ValueError, TypeError):
                    steals = 0
                
                try:
                    blk_val = row.get('BLK', '0').strip() or '0'
                    blocks = int(blk_val)
                except (ValueError, TypeError):
                    blocks = 0
                
                try:
                    fg_val = row.get('FG%', '0').strip() or '0'
                    fg_pct = float(fg_val)
                except (ValueError, TypeError):
                    fg_pct = 0.0
                
                try:
                    ts_val = row.get('TS%', '0').strip() or '0'
                    ts_pct = float(ts_val)
                except (ValueError, TypeError):
                    ts_pct = 0.0
                
                players.append(AllTimePlayer(
                    id=player_id,
                    name=name,
                    position=position,
                    team=team,
                    career_ws=career_ws,
                    career_from=career_from,
                    career_to=career_to,
                    games=games,
                    points=points,
                    rebounds=rebounds,
                    assists=assists,
                    steals=steals,
                    blocks=blocks,
                    fg_pct=fg_pct,
                    ts_pct=ts_pct
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
