from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..services.player_loader import load_players_from_csv, get_top_players_by_ranking
from ..services.scheduler import GameScheduler
from ..services.batch_scheduler import BatchScheduler
import os

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/load-players")
def load_players_endpoint(db: Session = Depends(get_db)):
    """Load players from CSV file"""
    # Try multiple possible CSV locations
    possible_paths = [
        "C:/Users/tmacr/OneDrive/Desktop/Peoples_Champ/frontend/public/data/Bbref_Adv_25-26.csv",
        "/opt/render/project/src/frontend/public/data/Bbref_Adv_25-26.csv",
        "/opt/render/project/src/data/Bbref_Adv_25-26.csv",
        "frontend/public/data/Bbref_Adv_25-26.csv",
        "data/Bbref_Adv_25-26.csv"
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        raise HTTPException(status_code=404, detail=f"CSV file not found in any of these locations: {possible_paths}")
    
    try:
        players = load_players_from_csv(db, csv_path)
        return {
            "message": f"Successfully loaded {len(players)} players from {csv_path}",
            "players_loaded": len(players)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading players: {str(e)}")

@router.post("/create-test-players")
def create_test_players_endpoint(db: Session = Depends(get_db)):
    """Create test players for demo purposes"""
    from ..models import Player
    
    test_players = [
        {"id": "jamesle01", "name": "LeBron James", "team": "LAL", "position": "SF", "total_ws": 15.0},
        {"id": "curryst01", "name": "Stephen Curry", "team": "GSW", "position": "PG", "total_ws": 14.5},
        {"id": "doncilu01", "name": "Luka Doncic", "team": "DAL", "position": "PG", "total_ws": 13.8},
        {"id": "antetgi01", "name": "Giannis Antetokounmpo", "team": "MIL", "position": "PF", "total_ws": 13.5},
        {"id": "jokicni01", "name": "Nikola Jokic", "team": "DEN", "position": "C", "total_ws": 13.2},
        {"id": "tatumja01", "name": "Jayson Tatum", "team": "BOS", "position": "SF", "total_ws": 12.8},
        {"id": "duranke01", "name": "Kevin Durant", "team": "PHO", "position": "PF", "total_ws": 12.5},
        {"id": "edwaran01", "name": "Anthony Edwards", "team": "MIN", "position": "SG", "total_ws": 12.0},
        {"id": "davisan01", "name": "Anthony Davis", "team": "LAL", "position": "PF", "total_ws": 11.8},
        {"id": "bookerde01", "name": "Devin Booker", "team": "PHO", "position": "SG", "total_ws": 11.5},
        {"id": "irvinky01", "name": "Kyrie Irving", "team": "DAL", "position": "PG", "total_ws": 11.2},
        {"id": "brownj02", "name": "Jaylen Brown", "team": "BOS", "position": "SG", "total_ws": 11.0},
        {"id": "embiijo01", "name": "Joel Embiid", "team": "PHI", "position": "C", "total_ws": 10.8},
        {"id": "willizi01", "name": "Zion Williamson", "team": "NOP", "position": "PF", "total_ws": 10.5},
        {"id": "maxeyty01", "name": "Tyrese Maxey", "team": "PHI", "position": "PG", "total_ws": 10.2},
        {"id": "georgpa01", "name": "Paul George", "team": "PHI", "position": "SF", "total_ws": 10.0},
        {"id": "leonaka01", "name": "Kawhi Leonard", "team": "LAC", "position": "SF", "total_ws": 9.8},
        {"id": "hardeja01", "name": "James Harden", "team": "LAC", "position": "PG", "total_ws": 9.5},
        {"id": "westbru01", "name": "Russell Westbrook", "team": "DEN", "position": "PG", "total_ws": 9.2},
        {"id": "holidjr01", "name": "Jrue Holiday", "team": "BOS", "position": "PG", "total_ws": 9.0},
        {"id": "butlerji01", "name": "Jimmy Butler", "team": "MIA", "position": "SF", "total_ws": 8.8},
        {"id": "adebaba01", "name": "Bam Adebayo", "team": "MIA", "position": "C", "total_ws": 8.5},
        {"id": "townska01", "name": "Karl-Anthony Towns", "team": "NYK", "position": "C", "total_ws": 8.2},
        {"id": "mitchdo01", "name": "Donovan Mitchell", "team": "CLE", "position": "SG", "total_ws": 8.0},
        {"id": "youngtr01", "name": "Trae Young", "team": "ATL", "position": "PG", "total_ws": 7.8},
        {"id": "lillada01", "name": "Damian Lillard", "team": "MIL", "position": "PG", "total_ws": 7.5},
        {"id": "goberru01", "name": "Rudy Gobert", "team": "MIN", "position": "C", "total_ws": 7.2},
        {"id": "siakapa01", "name": "Pascal Siakam", "team": "IND", "position": "PF", "total_ws": 7.0},
        {"id": "murrayde01", "name": "Dejounte Murray", "team": "NOP", "position": "PG", "total_ws": 6.8},
        {"id": "foxde01", "name": "De'Aaron Fox", "team": "SAC", "position": "PG", "total_ws": 6.5},
        {"id": "sabonido01", "name": "Domantas Sabonis", "team": "SAC", "position": "C", "total_ws": 6.2},
        {"id": "allenj01", "name": "Jarrett Allen", "team": "CLE", "position": "C", "total_ws": 6.0},
        {"id": "banchpa01", "name": "Paolo Banchero", "team": "ORL", "position": "PF", "total_ws": 5.8},
        {"id": "wembavi01", "name": "Victor Wembanyama", "team": "SAS", "position": "C", "total_ws": 5.5},
        {"id": "moranja01", "name": "Ja Morant", "team": "MEM", "position": "PG", "total_ws": 5.2},
        {"id": "ballla01", "name": "LaMelo Ball", "team": "CHA", "position": "PG", "total_ws": 5.0},
        {"id": "garrida01", "name": "Darius Garland", "team": "CLE", "position": "PG", "total_ws": 4.8},
        {"id": "halibu01", "name": "Tyrese Haliburton", "team": "IND", "position": "PG", "total_ws": 4.5},
        {"id": "johnsca02", "name": "Cam Johnson", "team": "BKN", "position": "SF", "total_ws": 4.2},
        {"id": "vanvlf01", "name": "Fred VanVleet", "team": "HOU", "position": "PG", "total_ws": 4.0},
        {"id": "senguap01", "name": "Alperen Sengun", "team": "HOU", "position": "C", "total_ws": 3.8},
        {"id": "greenda02", "name": "Draymond Green", "team": "GSW", "position": "PF", "total_ws": 3.5},
        {"id": "smartma01", "name": "Marcus Smart", "team": "MEM", "position": "PG", "total_ws": 3.2},
        {"id": "whitedr01", "name": "Derrick White", "team": "BOS", "position": "PG", "total_ws": 3.0},
        {"id": "porzikr01", "name": "Kristaps Porzingis", "team": "BOS", "position": "C", "total_ws": 2.8},
        {"id": "claxtni01", "name": "Nic Claxton", "team": "BKN", "position": "C", "total_ws": 2.5},
        {"id": "thompkl01", "name": "Klay Thompson", "team": "DAL", "position": "SG", "total_ws": 2.2},
        {"id": "wiggiand01", "name": "Andrew Wiggins", "team": "GSW", "position": "SF", "total_ws": 2.0},
        {"id": "poolejo01", "name": "Jordan Poole", "team": "WAS", "position": "PG", "total_ws": 1.8},
        {"id": "kuzmakyy01", "name": "Kyle Kuzma", "team": "WAS", "position": "PF", "total_ws": 1.5},
        {"id": "ingrabr01", "name": "Brandon Ingram", "team": "NOP", "position": "SF", "total_ws": 1.2},
        {"id": "mccolcj01", "name": "CJ McCollum", "team": "NOP", "position": "SG", "total_ws": 1.0},
        {"id": "valencj01", "name": "Cade Cunningham", "team": "DET", "position": "PG", "total_ws": 0.8},
        {"id": "greenj01", "name": "Jalen Green", "team": "HOU", "position": "SG", "total_ws": 0.5},
        {"id": "mobley01", "name": "Evan Mobley", "team": "CLE", "position": "PF", "total_ws": 0.2},
        {"id": "barnesr02", "name": "Scottie Barnes", "team": "TOR", "position": "SF", "total_ws": 0.1}
    ]
    
    inserted_count = 0
    for player_data in test_players:
        try:
            # Check if player already exists
            existing = db.query(Player).filter(Player.id == player_data["id"]).first()
            if existing:
                continue
                
            player = Player(
                id=player_data["id"],
                name=player_data["name"],
                team=player_data["team"],
                position=player_data["position"],
                seasons=1,
                current_age=28,
                total_ws=player_data["total_ws"],
                ws_per_game=player_data["total_ws"] / 82,
                threes_per_game=2.5,
                ast_per_game=5.0,
                stl_per_game=1.0,
                trb_per_game=6.0,
                blk_per_game=0.5,
                pts_per_game=20.0,
                three_pct=0.35,
                ft_pct=0.80,
                ts_pct=0.58,
                efg_pct=0.52,
                initial_rating=1500.0,
                current_rating=1500.0
            )
            
            db.add(player)
            db.commit()
            inserted_count += 1
            
        except Exception as e:
            db.rollback()
            continue
    
    return {
        "message": f"Successfully created {inserted_count} test players",
        "players_created": inserted_count
    }

@router.post("/generate-initial-schedule")
def generate_initial_schedule_endpoint(
    days_back: int = 3,
    days_forward: int = 47,
    db: Session = Depends(get_db)
):
    """Generate initial 50-day schedule (for first-time setup only)"""
    
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
            "message": "Initial schedule generated successfully",
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


@router.post("/generate-next-batch")
def generate_next_batch_endpoint(
    manual_override: bool = False,
    db: Session = Depends(get_db)
):
    """Generate next 30-day batch of matchups (runs automatically every 30 days)"""
    
    batch_scheduler = BatchScheduler(db)
    result = batch_scheduler.generate_next_batch(manual_override=manual_override)
    
    if result.get("success", True):
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))


@router.get("/schedule-status")
def get_schedule_status_endpoint(db: Session = Depends(get_db)):
    """Get current schedule status and check if new batch is needed"""
    
    batch_scheduler = BatchScheduler(db)
    return batch_scheduler.get_schedule_status()

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

@router.get("/full-reset")
def full_reset_and_regenerate(db: Session = Depends(get_db), top_n: int = 30, days_back: int = 6):
    """Reset database and regenerate everything with top N players - USE WITH CAUTION
    
    Args:
        top_n: Only use top N players for matchups (default 30)
        days_back: Generate matchups for this many days in the past for archive (default 6)
    """
    from ..models import DailySet, DailySetPlayer, Matchup, UserChoice, Player
    from ..services.player_loader import load_players_from_csv
    from ..services.batch_scheduler import BatchScheduler
    from ..services.scheduler import GameScheduler
    from itertools import combinations
    import random
    
    results = {"steps": [], "top_n_players": top_n, "days_back": days_back}
    
    # Step 1: Clear old schedule (but preserve user choices if possible)
    try:
        db.query(UserChoice).delete()
        db.query(Matchup).delete()
        db.query(DailySetPlayer).delete()
        db.query(DailySet).delete()
        db.commit()
        results["steps"].append("Cleared old schedule")
    except Exception as e:
        db.rollback()
        results["steps"].append(f"Error clearing schedule: {e}")
    
    # Step 2: Clear and reload players
    try:
        db.query(Player).delete()
        db.commit()
        results["steps"].append("Cleared old players")
    except Exception as e:
        db.rollback()
        results["steps"].append(f"Error clearing players: {e}")
    
    # Step 3: Load players from CSV
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        csv_path = os.path.join(base_dir, "data", "Bbref_Adv_25-26.csv")
        
        if not os.path.exists(csv_path):
            # Try alternate paths
            alt_paths = [
                "/app/data/Bbref_Adv_25-26.csv",
                "data/Bbref_Adv_25-26.csv",
            ]
            for alt in alt_paths:
                if os.path.exists(alt):
                    csv_path = alt
                    break
        
        if os.path.exists(csv_path):
            players = load_players_from_csv(db, csv_path)
            results["steps"].append(f"Loaded {len(players)} players from {csv_path}")
        else:
            results["steps"].append(f"CSV not found at {csv_path}")
            return results
    except Exception as e:
        results["steps"].append(f"Error loading players: {e}")
        return results
    
    # Step 4: Generate schedule with top N players, including past days for archive
    # Ensure at least 2 top 10 players per day, with good distribution of top 20
    try:
        # Get top N players
        top_players = db.query(Player).order_by(Player.total_ws.desc()).limit(top_n).all()
        results["steps"].append(f"Using top {len(top_players)} players for matchups")
        
        if len(top_players) < 5:
            results["steps"].append(f"Not enough players ({len(top_players)}) to generate schedule")
            return results
        
        # Separate into tiers
        top_10_players = top_players[:10] if len(top_players) >= 10 else top_players
        top_11_20_players = top_players[10:20] if len(top_players) >= 20 else top_players[10:]
        top_21_40_players = top_players[20:40] if len(top_players) >= 40 else top_players[20:]
        
        # Track appearances for all players
        all_appearances = {p.id: 0 for p in top_players}
        
        # Generate for past days (archive) + today + future days
        today = date.today()
        start_date = today - timedelta(days=days_back)
        total_days = days_back + 1 + 30  # past + today + 30 future days
        
        # Target appearances per tier (over ~40 days)
        # Top 10: each should appear 5-8 times
        # Top 11-20: each should appear 4-6 times  
        # Top 21-40: each should appear 2-4 times
        
        days_created = 0
        for day_offset in range(total_days):
            current_date = start_date + timedelta(days=day_offset)
            
            selected_players = []
            
            # ALWAYS add exactly 2 top 10 players per day
            # Prioritize those with fewer appearances
            sorted_top_10 = sorted(top_10_players, key=lambda p: all_appearances[p.id])
            selected_players.extend(sorted_top_10[:2])
            
            # Add 1-2 players from top 11-20 (prioritize fewer appearances)
            if top_11_20_players:
                sorted_11_20 = sorted(top_11_20_players, key=lambda p: all_appearances[p.id])
                num_from_11_20 = random.choice([1, 2])
                selected_players.extend(sorted_11_20[:num_from_11_20])
            
            # Fill remaining spots from top 21-40 (or top 11-20 if needed)
            remaining_spots = 5 - len(selected_players)
            if remaining_spots > 0:
                available = [p for p in top_21_40_players + top_11_20_players if p not in selected_players]
                if available:
                    sorted_available = sorted(available, key=lambda p: all_appearances[p.id])
                    selected_players.extend(sorted_available[:remaining_spots])
            
            # Update appearance counts
            for p in selected_players:
                all_appearances[p.id] += 1
            
            selected_ids = [p.id for p in selected_players]
            
            # Create daily set
            daily_set = DailySet(date=current_date, true_ranking=None)
            db.add(daily_set)
            db.flush()
            
            # Add players to daily set
            for player_id in selected_ids:
                db.add(DailySetPlayer(
                    daily_set_id=daily_set.id,
                    player_id=player_id
                ))
            
            # Create all matchups (10 matchups for 5 players)
            for idx, (p1_id, p2_id) in enumerate(combinations(selected_ids, 2)):
                db.add(Matchup(
                    daily_set_id=daily_set.id,
                    player1_id=p1_id,
                    player2_id=p2_id,
                    order_index=idx
                ))
            
            days_created += 1
        
        db.commit()
        
        # Report appearances by tier
        top_10_summary = {}
        top_11_20_summary = {}
        top_21_40_summary = {}
        
        for i, p in enumerate(top_players):
            count = all_appearances.get(p.id, 0)
            if i < 10:
                top_10_summary[p.name] = count
            elif i < 20:
                top_11_20_summary[p.name] = count
            else:
                top_21_40_summary[p.name] = count
        
        results["steps"].append(f"Generated {days_created} days of matchups from {start_date} to {start_date + timedelta(days=total_days-1)}")
        results["top_10_appearances"] = top_10_summary
        results["top_11_20_appearances"] = top_11_20_summary
        results["top_21_40_appearances"] = top_21_40_summary
        
    except Exception as e:
        db.rollback()
        results["steps"].append(f"Error generating schedule: {e}")
        return results
    
    results["success"] = True
    return results
