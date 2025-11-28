"""
Daily Player Game Schedule Generator

Generates a 50-day schedule with 5 players per day, respecting:
- Frequency constraints by rank tier
- Trio appearance constraints
- Balanced distribution
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from itertools import combinations
from collections import defaultdict
import json
import random


class DailyScheduleGenerator:
    """Generate optimal 50-day player schedule with constraints."""
    
    def __init__(self, rankings_file: str, start_date: str = None):
        """
        Initialize scheduler.
        
        Args:
            rankings_file: Path to player rankings CSV
            start_date: Start date (YYYY-MM-DD), defaults to today
        """
        self.rankings_file = rankings_file
        self.start_date = start_date or datetime.now().strftime('%Y-%m-%d')
        
        # Schedule parameters
        self.num_days = 50
        self.players_per_day = 5
        self.total_slots = self.num_days * self.players_per_day  # 250
        
        # Frequency constraints
        self.constraints = {
            'top_10': {'min': 3, 'max': 5, 'ranks': range(1, 11)},
            'tier_2': {'min': 2, 'max': 4, 'ranks': range(11, 31)},
            'tier_3': {'min': 1, 'max': 3, 'ranks': range(31, 76)}
        }
        
        # Trio constraints
        self.max_trio_appearances = 2
        self.top_10_trio_exception = True
        
        # Load data
        self.rankings = None
        self.players_by_tier = {}
        self.schedule = []
        self.player_appearances = defaultdict(int)
        self.trio_appearances = defaultdict(int)
        
    def load_rankings(self):
        """Load and prepare player rankings."""
        print(f"Loading rankings from {self.rankings_file}...")
        self.rankings = pd.read_csv(self.rankings_file)
        
        # Ensure rank column exists
        if 'rank' not in self.rankings.columns:
            self.rankings['rank'] = range(1, len(self.rankings) + 1)
        
        # Sort by rank
        self.rankings = self.rankings.sort_values('rank').reset_index(drop=True)
        
        # Organize players by tier
        self.players_by_tier = {
            'top_10': self.rankings[
                (self.rankings['rank'] >= 1) & 
                (self.rankings['rank'] <= 10)
            ].to_dict('records'),
            'tier_2': self.rankings[
                (self.rankings['rank'] >= 11) & 
                (self.rankings['rank'] <= 30)
            ].to_dict('records'),
            'tier_3': self.rankings[
                (self.rankings['rank'] >= 31) & 
                (self.rankings['rank'] <= 75)
            ].to_dict('records')
        }
        
        print(f"Loaded {len(self.rankings)} players")
        print(f"  - Top 10: {len(self.players_by_tier['top_10'])} players")
        print(f"  - Tier 2 (11-30): {len(self.players_by_tier['tier_2'])} players")
        print(f"  - Tier 3 (31-75): {len(self.players_by_tier['tier_3'])} players")
        
    def calculate_target_appearances(self):
        """Calculate target appearances for each tier."""
        targets = {}
        
        for tier_name, constraint in self.constraints.items():
            tier_size = len(self.players_by_tier[tier_name])
            min_total = tier_size * constraint['min']
            max_total = tier_size * constraint['max']
            
            # Calculate average target
            avg_target = (constraint['min'] + constraint['max']) / 2
            
            targets[tier_name] = {
                'min_total': min_total,
                'max_total': max_total,
                'avg_per_player': avg_target,
                'tier_size': tier_size
            }
            
            print(f"{tier_name}: {tier_size} players × {constraint['min']}-{constraint['max']} = "
                  f"{min_total}-{max_total} total appearances (avg {avg_target:.1f} each)")
        
        return targets
    
    def get_player_tier(self, player_rank: int) -> str:
        """Get tier name for a player rank."""
        if 1 <= player_rank <= 10:
            return 'top_10'
        elif 11 <= player_rank <= 30:
            return 'tier_2'
        elif 31 <= player_rank <= 75:
            return 'tier_3'
        return None
    
    def is_trio_valid(self, trio: tuple, day_players: list) -> bool:
        """
        Check if adding this trio violates constraints.
        
        Args:
            trio: Tuple of 3 player ranks
            day_players: List of player dicts already in this day
            
        Returns:
            True if trio is valid
        """
        # Check if all 3 are top 10 (exception applies)
        all_top_10 = all(rank <= 10 for rank in trio)
        
        if all_top_10 and self.top_10_trio_exception:
            return True  # No limit for all-top-10 trios
        
        # Check current appearances
        current_count = self.trio_appearances[trio]
        
        return current_count < self.max_trio_appearances
    
    def get_all_trios_in_day(self, day_players: list) -> list:
        """Get all unordered trios from a day's players."""
        if len(day_players) < 3:
            return []
        
        ranks = [p['rank'] for p in day_players]
        trios = []
        
        for combo in combinations(sorted(ranks), 3):
            trios.append(combo)
        
        return trios
    
    def can_add_player(self, player: dict, day_players: list) -> bool:
        """
        Check if player can be added to current day.
        
        Args:
            player: Player dict with rank
            day_players: List of players already in this day
            
        Returns:
            True if player can be added
        """
        # Check frequency constraint
        tier = self.get_player_tier(player['rank'])
        if tier:
            max_appearances = self.constraints[tier]['max']
            if self.player_appearances[player['rank']] >= max_appearances:
                return False
        
        # Check if player already in this day
        if any(p['rank'] == player['rank'] for p in day_players):
            return False
        
        # Check trio constraints
        if len(day_players) >= 2:
            # Check all potential trios this would create
            for existing_pair in combinations(day_players, 2):
                potential_trio = tuple(sorted([
                    player['rank'],
                    existing_pair[0]['rank'],
                    existing_pair[1]['rank']
                ]))
                
                if not self.is_trio_valid(potential_trio, day_players):
                    return False
        
        return True
    
    def get_player_priority_score(self, player: dict, day_num: int) -> float:
        """
        Calculate priority score for selecting a player.
        Higher score = higher priority.
        
        Factors:
        - How far below target appearances
        - Rank (better players slightly preferred)
        - Randomness for variety
        """
        tier = self.get_player_tier(player['rank'])
        if not tier:
            return 0.0
        
        # Current vs target appearances
        current = self.player_appearances[player['rank']]
        target = self.constraints[tier]['max']
        min_target = self.constraints[tier]['min']
        
        # Urgency: how far below minimum?
        days_remaining = self.num_days - day_num
        urgency = max(0, min_target - current) * 10
        
        # Preference for using players closer to min but not at max
        if current < min_target:
            appearance_score = 100  # High priority if below minimum
        elif current < target:
            appearance_score = 50  # Medium priority if below max
        else:
            appearance_score = 0  # At max, don't select
        
        # Slight preference for higher-ranked players (within tier)
        rank_score = (100 - player['rank']) * 0.1
        
        # Randomness for variety
        random_score = random.uniform(0, 20)
        
        total_score = urgency + appearance_score + rank_score + random_score
        
        return total_score
    
    def select_daily_players(self, day_num: int) -> list:
        """
        Select 5 players for a given day.
        
        Args:
            day_num: Day number (0-indexed)
            
        Returns:
            List of 5 player dicts
        """
        day_players = []
        attempts = 0
        max_attempts = 5000  # Increased for better solutions
        backtrack_count = 0
        max_backtracks = 100
        
        # Create candidate pool
        candidates = []
        for tier_name, players in self.players_by_tier.items():
            candidates.extend(players)
        
        while len(day_players) < self.players_per_day and attempts < max_attempts:
            attempts += 1
            
            # Score all candidates
            scored_candidates = []
            for player in candidates:
                if self.can_add_player(player, day_players):
                    score = self.get_player_priority_score(player, day_num)
                    scored_candidates.append((score, player))
            
            if not scored_candidates:
                # No valid candidates, backtrack
                if day_players and backtrack_count < max_backtracks:
                    backtrack_count += 1
                    # Remove last player and try again
                    removed = day_players.pop()
                    self.player_appearances[removed['rank']] -= 1
                    
                    # Remove trios that included this player
                    if len(day_players) >= 2:
                        for pair in combinations(day_players, 2):
                            trio = tuple(sorted([removed['rank'], pair[0]['rank'], pair[1]['rank']]))
                            if trio in self.trio_appearances:
                                self.trio_appearances[trio] -= 1
                else:
                    # Can't backtrack, this is a problem
                    print(f"WARNING: Could not fill day {day_num + 1} after {attempts} attempts")
                    break
                continue
            
            # Try top candidates with some randomness
            scored_candidates.sort(reverse=True, key=lambda x: x[0])
            
            # Select from top 5 candidates randomly for variety
            top_n = min(5, len(scored_candidates))
            selected_player = random.choice(scored_candidates[:top_n])[1]
            
            # Add player
            day_players.append(selected_player)
            self.player_appearances[selected_player['rank']] += 1
            
            # Update trio counts
            if len(day_players) >= 3:
                # Add all new trios created by this player
                for pair in combinations(day_players[:-1], 2):
                    trio = tuple(sorted([selected_player['rank'], pair[0]['rank'], pair[1]['rank']]))
                    self.trio_appearances[trio] += 1
        
        return day_players
    
    def generate_schedule(self):
        """Generate complete 50-day schedule."""
        print(f"\nGenerating {self.num_days}-day schedule...")
        print(f"Target: {self.players_per_day} players/day = {self.total_slots} total slots\n")
        
        # Calculate targets
        targets = self.calculate_target_appearances()
        print()
        
        # Reset tracking
        self.schedule = []
        self.player_appearances = defaultdict(int)
        self.trio_appearances = defaultdict(int)
        
        # Set random seed for reproducibility
        random.seed(42)
        
        # Generate each day
        start_date = datetime.strptime(self.start_date, '%Y-%m-%d')
        
        for day_num in range(self.num_days):
            current_date = start_date + timedelta(days=day_num)
            
            # Select players for this day
            day_players = self.select_daily_players(day_num)
            
            # Create day entry
            day_entry = {
                'day': day_num + 1,
                'date': current_date.strftime('%Y-%m-%d'),
                'day_of_week': current_date.strftime('%A'),
                'players': day_players,
                'player_names': [p['Player'] for p in day_players],
                'player_ranks': [p['rank'] for p in day_players]
            }
            
            self.schedule.append(day_entry)
            
            # Progress update
            if (day_num + 1) % 10 == 0:
                print(f"Generated {day_num + 1}/{self.num_days} days")
        
        print(f"\nSchedule generation complete!\n")
        
    def validate_schedule(self) -> dict:
        """Validate schedule against all constraints."""
        print("Validating schedule...\n")
        
        violations = []
        warnings = []
        
        # Check frequency constraints
        for tier_name, constraint in self.constraints.items():
            tier_players = self.players_by_tier[tier_name]
            
            for player in tier_players:
                rank = player['rank']
                count = self.player_appearances[rank]
                
                if count < constraint['min']:
                    violations.append(
                        f"Player #{rank} ({player['Player']}): {count} appearances "
                        f"(min {constraint['min']})"
                    )
                elif count > constraint['max']:
                    violations.append(
                        f"Player #{rank} ({player['Player']}): {count} appearances "
                        f"(max {constraint['max']})"
                    )
        
        # Check trio constraints
        for trio, count in self.trio_appearances.items():
            all_top_10 = all(rank <= 10 for rank in trio)
            
            if count > self.max_trio_appearances and not (all_top_10 and self.top_10_trio_exception):
                player_names = []
                for rank in trio:
                    player = self.rankings[self.rankings['rank'] == rank].iloc[0]
                    player_names.append(f"#{rank} {player['Player']}")
                
                violations.append(
                    f"Trio {{{', '.join(player_names)}}}: {count} appearances "
                    f"(max {self.max_trio_appearances})"
                )
        
        # Summary
        if violations:
            print(f"ERROR: Found {len(violations)} constraint violations:\n")
            for v in violations[:10]:  # Show first 10
                try:
                    print(f"  - {v}")
                except UnicodeEncodeError:
                    print(f"  - {v.encode('ascii', 'replace').decode('ascii')}")
            if len(violations) > 10:
                print(f"  ... and {len(violations) - 10} more")
        else:
            print("SUCCESS: All constraints satisfied!")
        
        if warnings:
            print(f"\nWARNING: {len(warnings)} warnings:")
            for w in warnings[:5]:
                try:
                    print(f"  - {w}")
                except UnicodeEncodeError:
                    print(f"  - {w.encode('ascii', 'replace').decode('ascii')}")
        
        return {
            'valid': len(violations) == 0,
            'violations': violations,
            'warnings': warnings
        }
    
    def print_statistics(self):
        """Print schedule statistics."""
        print("\n" + "="*70)
        print("SCHEDULE STATISTICS")
        print("="*70 + "\n")
        
        # Overall stats
        print(f"Total Days: {self.num_days}")
        print(f"Players per Day: {self.players_per_day}")
        print(f"Total Slots: {len(self.schedule) * self.players_per_day}")
        print(f"Unique Players: {len([p for p in self.player_appearances if self.player_appearances[p] > 0])}")
        print()
        
        # Frequency by tier
        for tier_name, constraint in self.constraints.items():
            tier_players = self.players_by_tier[tier_name]
            appearances = [self.player_appearances[p['rank']] for p in tier_players]
            
            print(f"{tier_name.upper()} (Ranks {constraint['ranks'].start}-{constraint['ranks'].stop - 1}):")
            print(f"  Players: {len(tier_players)}")
            print(f"  Constraint: {constraint['min']}-{constraint['max']} appearances each")
            print(f"  Actual: {min(appearances)}-{max(appearances)} appearances")
            print(f"  Average: {np.mean(appearances):.2f} appearances")
            print(f"  Total slots used: {sum(appearances)}")
            print()
        
        # Trio statistics
        total_trios = len(self.trio_appearances)
        max_trio_count = max(self.trio_appearances.values()) if self.trio_appearances else 0
        
        print(f"Trio Statistics:")
        print(f"  Unique trios: {total_trios}")
        print(f"  Max appearances: {max_trio_count}")
        
        # Count trios by appearance frequency
        trio_freq = defaultdict(int)
        for count in self.trio_appearances.values():
            trio_freq[count] += 1
        
        print(f"  Distribution:")
        for count in sorted(trio_freq.keys()):
            print(f"    {count} appearances: {trio_freq[count]} trios")
        print()
    
    def export_schedule(self, output_dir: str = 'data'):
        """Export schedule to multiple formats."""
        print("Exporting schedule...\n")
        
        # 1. Daily schedule CSV
        daily_rows = []
        for day in self.schedule:
            for i, player in enumerate(day['players'], 1):
                daily_rows.append({
                    'day': day['day'],
                    'date': day['date'],
                    'day_of_week': day['day_of_week'],
                    'player_slot': i,
                    'rank': player['rank'],
                    'player': player['Player'],
                    'team': player.get('Team', ''),
                    'final_score': player.get('final_score', ''),
                    'bpm': player.get('BPM', '')
                })
        
        daily_df = pd.DataFrame(daily_rows)
        daily_file = f"{output_dir}/daily_schedule.csv"
        daily_df.to_csv(daily_file, index=False)
        print(f"Saved: {daily_file}")
        
        # 2. Player frequency CSV
        freq_rows = []
        for tier_name, tier_players in self.players_by_tier.items():
            for player in tier_players:
                rank = player['rank']
                freq_rows.append({
                    'rank': rank,
                    'player': player['Player'],
                    'team': player.get('Team', ''),
                    'tier': tier_name,
                    'appearances': self.player_appearances[rank],
                    'min_allowed': self.constraints[tier_name]['min'],
                    'max_allowed': self.constraints[tier_name]['max']
                })
        
        freq_df = pd.DataFrame(freq_rows).sort_values('rank')
        freq_file = f"{output_dir}/player_frequency.csv"
        freq_df.to_csv(freq_file, index=False)
        print(f"Saved: {freq_file}")
        
        # 3. JSON export with full details
        json_data = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'start_date': self.start_date,
                'num_days': self.num_days,
                'players_per_day': self.players_per_day,
                'total_slots': self.total_slots
            },
            'constraints': {
                tier: {
                    'min': c['min'],
                    'max': c['max'],
                    'ranks': f"{c['ranks'].start}-{c['ranks'].stop - 1}"
                }
                for tier, c in self.constraints.items()
            },
            'schedule': [
                {
                    'day': day['day'],
                    'date': day['date'],
                    'day_of_week': day['day_of_week'],
                    'players': [
                        {
                            'rank': p['rank'],
                            'name': p['Player'],
                            'team': p.get('Team', ''),
                            'score': float(p.get('final_score', 0)) if pd.notna(p.get('final_score')) else None
                        }
                        for p in day['players']
                    ]
                }
                for day in self.schedule
            ],
            'statistics': {
                'unique_players': len([p for p in self.player_appearances if self.player_appearances[p] > 0]),
                'unique_trios': len(self.trio_appearances),
                'max_trio_appearances': max(self.trio_appearances.values()) if self.trio_appearances else 0
            }
        }
        
        json_file = f"{output_dir}/daily_schedule.json"
        with open(json_file, 'w') as f:
            json.dump(json_data, f, indent=2)
        print(f"Saved: {json_file}")
        
        # 4. Human-readable schedule
        readme_file = f"{output_dir}/DAILY_SCHEDULE.md"
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write("# Daily Player Game Schedule\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Start Date:** {self.start_date}\n")
            f.write(f"**Duration:** {self.num_days} days\n\n")
            
            f.write("## Schedule\n\n")
            
            for day in self.schedule:
                f.write(f"### Day {day['day']} - {day['date']} ({day['day_of_week']})\n\n")
                
                for i, player in enumerate(day['players'], 1):
                    f.write(f"{i}. **#{player['rank']} {player['Player']}** ({player.get('Team', 'N/A')})\n")
                
                f.write("\n")
            
            f.write("\n## Player Frequency\n\n")
            f.write("| Rank | Player | Tier | Appearances | Range |\n")
            f.write("|------|--------|------|-------------|-------|\n")
            
            for _, row in freq_df.head(50).iterrows():
                f.write(f"| {row['rank']} | {row['player']} | {row['tier']} | "
                       f"{row['appearances']} | {row['min_allowed']}-{row['max_allowed']} |\n")
        
        print(f"Saved: {readme_file}")
        print()


def main():
    """Main execution function."""
    print("="*70)
    print("DAILY PLAYER GAME SCHEDULE GENERATOR")
    print("="*70 + "\n")
    
    # Configuration
    rankings_file = 'data/player_rankings_24-25_v3.csv'
    
    # Check if V3 rankings exist, fallback to other versions
    import os
    if not os.path.exists(rankings_file):
        print(f"WARNING: {rankings_file} not found, checking alternatives...")
        
        alternatives = [
            'data/player_rankings_multi_year_v2.csv',
            'data/player_rankings_2025-26.csv'
        ]
        
        for alt in alternatives:
            if os.path.exists(alt):
                rankings_file = alt
                print(f"Using {rankings_file}\n")
                break
        else:
            print("ERROR: No rankings file found. Please run generate_player_rankings_v3.py first.")
            return
    
    # Initialize generator with start date 5 days ago for archive
    start_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
    generator = DailyScheduleGenerator(
        rankings_file=rankings_file,
        start_date=start_date
    )
    
    # Load rankings
    generator.load_rankings()
    print()
    
    # Generate schedule
    generator.generate_schedule()
    
    # Validate
    validation = generator.validate_schedule()
    
    # Print statistics
    generator.print_statistics()
    
    # Export
    generator.export_schedule()
    
    # Final summary
    print("="*70)
    if validation['valid']:
        print("SUCCESS - Schedule generated and validated!")
    else:
        print(f"COMPLETE - Schedule generated with {len(validation['violations'])} violations")
    print("="*70)
    print("\nOutput files:")
    print("  - data/daily_schedule.csv (daily breakdown)")
    print("  - data/player_frequency.csv (appearance counts)")
    print("  - data/daily_schedule.json (full data)")
    print("  - data/DAILY_SCHEDULE.md (human-readable)")
    print()


if __name__ == '__main__':
    main()
