import csv
import os
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models import Player
from ..db.session import get_db

def load_players_from_csv(db: Session, csv_path: str) -> List[Player]:
    """Load players from CSV file into database"""
    players = []
    
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        return players
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Skip rows without player ID
            if not row.get('Player-additional'):
                continue
                
            player_id = row['Player-additional']
            
            # Check if player already exists
            existing = db.query(Player).filter(Player.id == player_id).first()
            if existing:
                continue
            
            # Create new player
            player = Player(
                id=player_id,
                name=row.get('Player', ''),
                team=row.get('Team', ''),
                position=row.get('Pos', ''),
                seasons=1,  # Default
                current_age=int(float(row.get('Age', 0))) if row.get('Age') else None,
                total_ws=float(row.get('WS', 0)) if row.get('WS') else 0,
                ws_per_game=float(row.get('WS', 0)) / max(float(row.get('G', 1)), 1) if row.get('WS') and row.get('G') else 0,
                threes_per_game=float(row.get('3P', 0)) / max(float(row.get('G', 1)), 1) if row.get('3P') and row.get('G') else 0,
                ast_per_game=float(row.get('AST', 0)) / max(float(row.get('G', 1)), 1) if row.get('AST') and row.get('G') else 0,
                stl_per_game=float(row.get('STL', 0)) / max(float(row.get('G', 1)), 1) if row.get('STL') and row.get('G') else 0,
                trb_per_game=float(row.get('TRB', 0)) / max(float(row.get('G', 1)), 1) if row.get('TRB') and row.get('G') else 0,
                blk_per_game=float(row.get('BLK', 0)) / max(float(row.get('G', 1)), 1) if row.get('BLK') and row.get('G') else 0,
                pts_per_game=float(row.get('PTS', 0)) / max(float(row.get('G', 1)), 1) if row.get('PTS') and row.get('G') else 0,
                three_pct=float(row.get('3P%', 0)) if row.get('3P%') else None,
                ft_pct=float(row.get('FT%', 0)) if row.get('FT%') else None,
                ts_pct=float(row.get('TS%', 0)) if row.get('TS%') else None,
                efg_pct=float(row.get('eFG%', 0)) if row.get('eFG%') else None,
                initial_rating=1500.0,  # Default ELO rating
                current_rating=1500.0
            )
            
            db.add(player)
            players.append(player)
    
    db.commit()
    print(f"Loaded {len(players)} players into database")
    return players

def get_top_players_by_ranking(db: Session, limit: int = 100) -> List[Player]:
    """Get top players ordered by total win shares (proxy for ranking)"""
    return db.query(Player).order_by(Player.total_ws.desc()).limit(limit).all()
