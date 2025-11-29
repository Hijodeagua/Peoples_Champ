from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..services.player_loader import load_players_from_csv, get_top_players_by_ranking
from ..services.scheduler import GameScheduler
import os

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/load-players")
def load_players_endpoint(db: Session = Depends(get_db)):
    """Load players from CSV file"""
    # Try multiple possible CSV locations
    possible_paths = [
        "C:/Users/tmacr/OneDrive/Desktop/Peoples_Champ/frontend/public/data/Bbref_Adv_25-26.csv",
        "C:/Users/tmacr/OneDrive/Desktop/Peoples_Champ/data/Bbref_Adv_25-26.csv",
        os.path.join(os.path.dirname(__file__), "../../../frontend/public/data/Bbref_Adv_25-26.csv"),
        os.path.join(os.path.dirname(__file__), "../../../data/Bbref_Adv_25-26.csv")
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        raise HTTPException(status_code=404, detail=f"CSV file not found. Tried: {possible_paths}")
    
    try:
        players = load_players_from_csv(db, csv_path)
        return {
            "message": f"Successfully loaded {len(players)} players from {csv_path}",
            "players_loaded": len(players)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading players: {str(e)}")

@router.post("/generate-schedule")
def generate_schedule_endpoint(
    days_back: int = 3,
    days_forward: int = 47,
    db: Session = Depends(get_db)
):
    """Generate 50-day schedule starting from 3 days ago"""
    
    scheduler = GameScheduler(db)
    
    # Load top players
    player_count = scheduler.load_top_players(100)
    if player_count < 75:
        raise HTTPException(
            status_code=400, 
            detail=f"Need at least 75 players in database, found {player_count}. Run /admin/load-players first."
        )
    
    # Generate schedule starting from 3 days ago
    start_date = date.today() - timedelta(days=days_back)
    
    try:
        schedule = scheduler.generate_50_day_schedule(start_date)
        scheduler.save_schedule_to_database()
        
        return {
            "message": "Schedule generated successfully",
            "start_date": start_date.isoformat(),
            "end_date": (start_date + timedelta(days=49)).isoformat(),
            "total_days": len(schedule),
            "schedule_preview": {
                date_str: [
                    next((p.name for p in scheduler.players if p.id == pid), pid)
                    for pid in player_ids
                ]
                for date_str, player_ids in list(schedule.items())[:5]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate schedule: {str(e)}")

@router.get("/schedule-stats")
def get_schedule_stats(db: Session = Depends(get_db)):
    """Get statistics about the current schedule"""
    from ..models import DailySet, DailySetPlayer
    from collections import Counter
    
    # Get all daily sets
    daily_sets = db.query(DailySet).all()
    
    if not daily_sets:
        return {"message": "No schedule found. Run /admin/generate-schedule first."}
    
    # Count player appearances
    player_counts = Counter()
    for daily_set in daily_sets:
        for dsp in daily_set.players:
            player_counts[dsp.player.name] += 1
    
    # Get date range
    dates = [ds.date for ds in daily_sets]
    start_date = min(dates)
    end_date = max(dates)
    
    return {
        "total_days": len(daily_sets),
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "total_player_appearances": sum(player_counts.values()),
        "unique_players": len(player_counts),
        "top_players_by_appearances": dict(player_counts.most_common(20))
    }

@router.delete("/reset-schedule")
def reset_schedule(db: Session = Depends(get_db)):
    """Reset all daily sets and matchups"""
    from ..models import DailySet, DailySetPlayer, Matchup, UserChoice
    
    # Delete in correct order due to foreign key constraints
    db.query(UserChoice).delete()
    db.query(Matchup).delete()
    db.query(DailySetPlayer).delete()
    db.query(DailySet).delete()
    
    db.commit()
    
    return {"message": "Schedule reset successfully"}

@router.get("/today-preview")
def get_today_preview(db: Session = Depends(get_db)):
    """Preview today's matchup without the full game endpoint"""
    from ..models import DailySet
    
    today = date.today()
    daily_set = db.query(DailySet).filter(DailySet.date == today).first()
    
    if not daily_set:
        return {"message": "No daily set for today"}
    
    players = [{"name": dsp.player.name, "team": dsp.player.team} for dsp in daily_set.players]
    matchup_count = len(daily_set.matchups)
    
    return {
        "date": today.isoformat(),
        "players": players,
        "matchup_count": matchup_count
    }
