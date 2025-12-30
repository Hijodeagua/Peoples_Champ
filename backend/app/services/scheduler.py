from datetime import date, timedelta
from typing import List, Dict, Set, Tuple
from itertools import combinations
from collections import defaultdict, Counter
import random
from sqlalchemy.orm import Session
from ..models import Player, DailySet, DailySetPlayer, Matchup
import json

class GameScheduler:
    def __init__(self, db: Session):
        self.db = db
        self.players = []
        self.schedule = {}  # date -> [player_ids]
        self.trio_counts = defaultdict(int)  # frozenset of 3 player_ids -> count
        
    def load_top_players(self, limit: int = 100):
        """Load top players ordered by win shares"""
        self.players = self.db.query(Player).order_by(Player.total_ws.desc()).limit(limit).all()
        return len(self.players)
    
    def get_player_tier(self, player_rank: int) -> str:
        """Determine player tier based on ranking - focus on top stars"""
        if player_rank <= 10:
            return "superstar"
        elif player_rank <= 20:
            return "star"
        elif player_rank <= 30:
            return "solid"
        else:
            return "bench"
    
    def get_frequency_range(self, tier: str) -> Tuple[int, int]:
        """Get min/max appearances for each tier - heavily favor superstars"""
        ranges = {
            "superstar": (4, 6),  # Superstars appear very frequently
            "star": (3, 5),       # Stars appear frequently  
            "solid": (1, 2),      # Solid players appear occasionally
            "bench": (0, 1)       # Bench players rarely appear
        }
        return ranges.get(tier, (0, 1))
    
    def count_trios_in_group(self, player_ids: List[str]) -> List[frozenset]:
        """Get all trios (3-player combinations) in a 5-player group"""
        return [frozenset(trio) for trio in combinations(player_ids, 3)]
    
    def is_valid_group(self, player_ids: List[str]) -> bool:
        """Check if a 5-player group violates trio constraints"""
        trios = self.count_trios_in_group(player_ids)
        
        for trio in trios:
            current_count = self.trio_counts[trio]
            
            # Check if all 3 are top 10 players (exception case)
            trio_ranks = []
            for pid in trio:
                for i, player in enumerate(self.players):
                    if player.id == pid:
                        trio_ranks.append(i + 1)
                        break
            
            all_top10 = all(rank <= 10 for rank in trio_ranks)
            
            # If not all top 10, enforce limit of 2
            if not all_top10 and current_count >= 2:
                return False
                
        return True
    
    def update_trio_counts(self, player_ids: List[str]):
        """Update trio counts after adding a group"""
        trios = self.count_trios_in_group(player_ids)
        for trio in trios:
            self.trio_counts[trio] += 1
    
    def generate_50_day_schedule(self, start_date: date) -> Dict[str, List[str]]:
        """Generate 50-day schedule with constraints"""
        if len(self.players) < 75:
            raise ValueError(f"Need at least 75 players, got {len(self.players)}")
        
        # Initialize frequency tracking
        player_appearances = Counter()
        
        # Calculate target appearances for each player
        target_appearances = {}
        for i, player in enumerate(self.players[:75]):  # Only use top 75
            tier = self.get_player_tier(i + 1)
            min_freq, max_freq = self.get_frequency_range(tier)
            target_appearances[player.id] = random.randint(min_freq, max_freq)
        
        schedule = {}
        
        for day_offset in range(50):
            current_date = start_date + timedelta(days=day_offset)
            date_str = current_date.isoformat()
            
            # Try to find a valid 5-player group
            attempts = 0
            max_attempts = 1000
            
            while attempts < max_attempts:
                # Select 5 players with preference for those needing more appearances
                available_players = [
                    p for p in self.players[:75] 
                    if player_appearances[p.id] < target_appearances.get(p.id, 0)
                ]
                
                if len(available_players) < 5:
                    # If not enough players need appearances, include others
                    available_players = self.players[:75]
                
                # Weighted selection favoring players who need more appearances
                weights = []
                for player in available_players:
                    target = target_appearances.get(player.id, 0)
                    current = player_appearances[player.id]
                    weight = max(1, target - current + 1)
                    weights.append(weight)
                
                selected_players = random.choices(available_players, weights=weights, k=5)
                selected_ids = [p.id for p in selected_players]
                
                # Check trio constraints
                if self.is_valid_group(selected_ids):
                    schedule[date_str] = selected_ids
                    self.update_trio_counts(selected_ids)
                    
                    # Update appearance counts
                    for pid in selected_ids:
                        player_appearances[pid] += 1
                    
                    break
                
                attempts += 1
            
            if attempts >= max_attempts:
                print(f"Warning: Could not find valid group for {date_str}, using random selection")
                random_players = random.sample(self.players[:75], 5)
                schedule[date_str] = [p.id for p in random_players]
        
        self.schedule = schedule
        return schedule
    
    def save_schedule_to_database(self):
        """Save the generated schedule to database"""
        for date_str, player_ids in self.schedule.items():
            schedule_date = date.fromisoformat(date_str)
            
            # Check if daily set already exists
            existing = self.db.query(DailySet).filter(DailySet.date == schedule_date).first()
            if existing:
                continue
            
            # Create daily set
            daily_set = DailySet(date=schedule_date, true_ranking=None)
            self.db.add(daily_set)
            self.db.flush()
            
            # Add players to daily set
            for player_id in player_ids:
                self.db.add(DailySetPlayer(
                    daily_set_id=daily_set.id,
                    player_id=player_id
                ))
            
            # Create all matchups (combinations of 5 players = 10 matchups)
            for idx, (p1_id, p2_id) in enumerate(combinations(player_ids, 2)):
                self.db.add(Matchup(
                    daily_set_id=daily_set.id,
                    player1_id=p1_id,
                    player2_id=p2_id,
                    order_index=idx
                ))
        
        self.db.commit()
        print(f"Saved {len(self.schedule)} daily sets to database")
    
    def print_schedule_stats(self):
        """Print statistics about the generated schedule"""
        if not self.schedule:
            print("No schedule generated")
            return
        
        player_counts = Counter()
        for player_ids in self.schedule.values():
            for pid in player_ids:
                player_counts[pid] += 1
        
        print(f"\n=== SCHEDULE STATISTICS ===")
        print(f"Total days: {len(self.schedule)}")
        print(f"Total player appearances: {sum(player_counts.values())}")
        print(f"Unique players used: {len(player_counts)}")
        
        # Group by tier
        tier_stats = defaultdict(list)
        for i, player in enumerate(self.players[:100]):
            if player.id in player_counts:
                tier = self.get_player_tier(i + 1)
                tier_stats[tier].append((player.name, player_counts[player.id]))
        
        for tier, players in tier_stats.items():
            print(f"\n{tier.upper()} tier:")
            for name, count in sorted(players, key=lambda x: x[1], reverse=True):
                print(f"  {name}: {count} appearances")
        
        print(f"\nTrio constraint violations: {sum(1 for count in self.trio_counts.values() if count > 2)}")
        print(f"Total trios tracked: {len(self.trio_counts)}")
