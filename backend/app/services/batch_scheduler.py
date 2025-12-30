from datetime import date, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from .scheduler import GameScheduler
from ..models import DailySet
import logging

logger = logging.getLogger(__name__)

class BatchScheduler:
    def __init__(self, db: Session, top_n_players: int = 25):
        self.db = db
        self.batch_size = 30  # 30-day batches
        self.top_n_players = top_n_players  # Only use top N players for matchups
        
    def get_last_scheduled_date(self) -> Optional[date]:
        """Get the last date that has a scheduled daily set"""
        try:
            last_set = self.db.query(DailySet).order_by(DailySet.date.desc()).first()
            return last_set.date if last_set else None
        except Exception as e:
            logger.error(f"Error getting last scheduled date: {e}")
            self.db.rollback()
            return None
    
    def days_until_schedule_ends(self) -> int:
        """Calculate how many days until the current schedule runs out"""
        last_date = self.get_last_scheduled_date()
        if not last_date:
            return 0
        
        today = date.today()
        return (last_date - today).days
    
    def needs_new_batch(self, buffer_days: int = 5) -> bool:
        """Check if we need to generate a new 30-day batch"""
        days_remaining = self.days_until_schedule_ends()
        return days_remaining <= buffer_days
    
    def generate_next_batch(self, manual_override: bool = False) -> Dict:
        """Generate the next 30-day batch of matchups"""
        
        if not manual_override and not self.needs_new_batch():
            days_remaining = self.days_until_schedule_ends()
            return {
                "message": f"Schedule still has {days_remaining} days remaining. No new batch needed.",
                "days_remaining": days_remaining,
                "next_batch_needed": False
            }
        
        # Determine start date for next batch
        last_date = self.get_last_scheduled_date()
        if last_date:
            start_date = last_date + timedelta(days=1)
        else:
            # If no schedule exists, start from today
            start_date = date.today()
        
        # Generate 30-day schedule
        scheduler = GameScheduler(self.db)
        player_count = scheduler.load_top_players(self.top_n_players)
        
        if player_count < 5:
            return {
                "error": f"Need at least 5 players, found {player_count}",
                "success": False
            }
        
        try:
            # Generate exactly 30 days
            schedule = {}
            import random
            
            for day_offset in range(self.batch_size):
                current_date = start_date + timedelta(days=day_offset)
                date_str = current_date.isoformat()
                
                # Check if this date already exists (avoid duplicates)
                existing = self.db.query(DailySet).filter(DailySet.date == current_date).first()
                if existing:
                    continue
                
                # Select 5 players with weighted preference for top stars
                available_players = scheduler.players[:self.top_n_players]
                
                # Create weights heavily favoring top players
                weights = []
                for i, player in enumerate(available_players):
                    if i < 10:  # Top 10 superstars
                        weight = 15  # Much higher weight for superstars
                    elif i < 15:  # Next 5 stars  
                        weight = 8
                    elif i < 20:  # Next 5 solid players
                        weight = 3
                    else:  # Remaining players (20-25)
                        weight = 1
                    weights.append(weight)
                
                # Use weighted selection to favor top players
                selected_players = random.choices(available_players, weights=weights, k=5)
                selected_ids = [p.id for p in selected_players]
                
                schedule[date_str] = selected_ids
            
            # Save to database
            scheduler.schedule = schedule
            scheduler.save_schedule_to_database()
            
            return {
                "message": f"Successfully generated {len(schedule)} days of matchups",
                "start_date": start_date.isoformat(),
                "end_date": (start_date + timedelta(days=len(schedule)-1)).isoformat(),
                "days_generated": len(schedule),
                "success": True,
                "batch_size": self.batch_size
            }
            
        except Exception as e:
            logger.error(f"Failed to generate batch schedule: {str(e)}")
            return {
                "error": f"Failed to generate schedule: {str(e)}",
                "success": False
            }
    
    def get_schedule_status(self) -> Dict:
        """Get current schedule status"""
        try:
            last_date = self.get_last_scheduled_date()
            days_remaining = self.days_until_schedule_ends()
            needs_batch = self.needs_new_batch()
            
            total_sets = self.db.query(DailySet).count()
            
            return {
                "total_daily_sets": total_sets,
                "last_scheduled_date": last_date.isoformat() if last_date else None,
                "days_remaining": days_remaining,
                "needs_new_batch": needs_batch,
                "batch_size": self.batch_size,
                "current_date": date.today().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting schedule status: {e}")
            self.db.rollback()
            return {
                "total_daily_sets": 0,
                "last_scheduled_date": None,
                "days_remaining": 0,
                "needs_new_batch": True,
                "batch_size": self.batch_size,
                "current_date": date.today().isoformat(),
                "error": str(e)
            }
