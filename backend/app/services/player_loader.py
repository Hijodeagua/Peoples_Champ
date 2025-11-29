import csv
import os
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models import Player
from ..db.session import get_db

def safe_int(value: str) -> int:
    try:
        return int(value)
    except ValueError:
        return None

def safe_float(value: str) -> float:
    try:
        return float(value)
    except ValueError:
        return None

def load_players_from_csv(db: Session, csv_path: str) -> List[Player]:
    """Load players from CSV file into database"""
    players = []
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Skip empty rows
            if not row.get('Player'):
                continue
                
            player_data = {
                'id': row.get('bbref_id', '').strip(),
                'name': row.get('Player', '').strip(),
                'team': row.get('Tm', '').strip() or None,
                'position': row.get('Pos', '').strip() or None,
                'seasons': safe_int(row.get('Seasons', 1)),
                'current_age': safe_int(row.get('Age')),
                'total_ws': safe_float(row.get('WS', 0)),
                'ws_per_game': safe_float(row.get('WS/48', 0)) / 48 if safe_float(row.get('WS/48', 0)) else 0,
                'threes_per_game': safe_float(row.get('3PA', 0)),
                'ast_per_game': safe_float(row.get('AST', 0)),
                'stl_per_game': safe_float(row.get('STL', 0)),
                'trb_per_game': safe_float(row.get('TRB', 0)),
                'blk_per_game': safe_float(row.get('BLK', 0)),
                'pts_per_game': safe_float(row.get('PTS', 0)),
                'three_pct': safe_float(row.get('3P%')) if row.get('3P%') else None,
                'ft_pct': safe_float(row.get('FT%')) if row.get('FT%') else None,
                'ts_pct': safe_float(row.get('TS%', 0)),
                'efg_pct': safe_float(row.get('eFG%')) if row.get('eFG%') else None,
                'initial_rating': 1500.0,
                'current_rating': 1500.0
            }
            
            # Skip if no ID
            if not player_data['id']:
                continue
            
            # Check if player already exists
            existing_player = db.query(Player).filter(Player.id == player_data['id']).first()
            if existing_player:
                continue  # Skip duplicates
                
            player = Player(**player_data)
            players.append(player)
    
    # Insert players one by one to handle duplicates gracefully
    inserted_count = 0
    for player in players:
        try:
            db.add(player)
            db.commit()
            inserted_count += 1
        except Exception as e:
            db.rollback()
            # Skip this player and continue
            continue
        
    print(f"Loaded {inserted_count} players into database")
    return players[:inserted_count]

def get_top_players_by_ranking(db: Session, limit: int = 100) -> List[Player]:
    """Get top players ordered by total win shares (proxy for ranking)"""
    return db.query(Player).order_by(Player.total_ws.desc()).limit(limit).all()
