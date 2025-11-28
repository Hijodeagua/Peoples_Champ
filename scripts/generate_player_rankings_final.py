"""
Final Player Rankings System - Enhanced Weighting

Key improvements:
- Single row per player (no duplicates)
- Enhanced weighting for PER, WS, BPM, VORP, Awards
- Heavy playoff weighting
- Playing time reliability factor
- Direct H2H simulation
"""

import pandas as pd
import numpy as np
from datetime import datetime
from itertools import combinations
import json
from collections import defaultdict
import random


class FinalPlayerRankings:
    """Enhanced player ranking system with improved metrics."""
    
    def __init__(self, data_dir: str = 'data'):
        self.data_dir = data_dir
        self.current_season = '24-25'
        
        # Enhanced weights for key metrics
        self.metric_weights = {
            # Core advanced stats (higher weights)
            'PER': 0.25,      # Player Efficiency Rating (INCREASED)
            'WS': 0.20,       # Win Shares (INCREASED)
            'BPM': 0.20,      # Box Plus/Minus (INCREASED)
            'VORP': 0.15,     # Value Over Replacement (INCREASED)
            
            # Supporting metrics
            'WS/48': 0.08,
            'TS%': 0.05,
            'TRB%': 0.03,
            'AST%': 0.02,
            'STL%': 0.01,
            'BLK%': 0.01
        }
        
        # Playing time weights
        self.playing_time_weights = {
            'games_started': 0.6,
            'minutes_played': 0.4
        }
        
        # Playoff multiplier
        self.playoff_multiplier = 2.5  # Increased from 2.0
        
        # Awards weight
        self.awards_weight = 0.10  # 10% bonus for awards
        
        # Minimum thresholds
        self.min_games = 10
        self.min_minutes = 200
        
    def load_data(self):
        """Load current season data."""
        print(f"Loading {self.current_season} season data...")
        
        # Regular season
        reg_file = f"{self.data_dir}/Bbref_Adv_{self.current_season}.csv"
        self.regular_season = pd.read_csv(reg_file)
        
        # Playoff season
        playoff_file = f"{self.data_dir}/Bbref_Playoff_Adv_{self.current_season}.csv"
        try:
            self.playoff_season = pd.read_csv(playoff_file)
            print(f"Loaded {len(self.playoff_season)} playoff players")
        except FileNotFoundError:
            self.playoff_season = pd.DataFrame()
            print("No playoff data found")
        
        # Ringer rankings for comparison
        try:
            self.ringer_rankings = pd.read_csv(f"{self.data_dir}/ringer_top_100.csv")
            print(f"Loaded {len(self.ringer_rankings)} Ringer rankings")
        except FileNotFoundError:
            self.ringer_rankings = pd.DataFrame()
            print("No Ringer rankings found")
        
        print(f"Loaded {len(self.regular_season)} regular season players\n")
        
    def combine_season_data(self):
        """Combine regular and playoff data with heavy playoff weighting."""
        print("Combining regular season and playoff data...")
        
        # Start with regular season
        combined = self.regular_season.copy()
        
        if not self.playoff_season.empty:
            # For players with playoff data, weight their stats
            for idx, player_row in combined.iterrows():
                player_name = player_row['Player']
                
                # Find playoff data
                playoff_data = self.playoff_season[
                    self.playoff_season['Player'] == player_name
                ]
                
                if not playoff_data.empty:
                    playoff_row = playoff_data.iloc[0]
                    
                    # Get regular and playoff stats
                    reg_mp = player_row['MP']
                    playoff_mp = playoff_row['MP']
                    
                    # Apply playoff multiplier to playoff minutes
                    weighted_playoff_mp = playoff_mp * self.playoff_multiplier
                    total_weighted_mp = reg_mp + weighted_playoff_mp
                    
                    # Weight each metric
                    for metric in ['PER', 'BPM', 'VORP', 'WS/48', 'TS%']:
                        if metric in combined.columns and metric in playoff_data.columns:
                            reg_val = player_row[metric]
                            playoff_val = playoff_row[metric]
                            
                            # Weighted average
                            if pd.notna(reg_val) and pd.notna(playoff_val):
                                weighted_val = (
                                    (reg_val * reg_mp + playoff_val * weighted_playoff_mp) /
                                    total_weighted_mp
                                )
                                combined.at[idx, metric] = weighted_val
                    
                    # Add playoff games/minutes to totals
                    combined.at[idx, 'G'] = player_row['G'] + playoff_row['G']
                    combined.at[idx, 'GS'] = player_row['GS'] + playoff_row['GS']
                    combined.at[idx, 'MP'] = total_weighted_mp
                    
                    # Track playoff participation
                    combined.at[idx, 'Has_Playoff_Data'] = True
                    combined.at[idx, 'Playoff_Games'] = playoff_row['G']
                else:
                    combined.at[idx, 'Has_Playoff_Data'] = False
                    combined.at[idx, 'Playoff_Games'] = 0
        
        self.combined_data = combined
        print(f"Combined data ready: {len(self.combined_data)} players\n")
        
    def calculate_awards_bonus(self, player_row):
        """Calculate bonus for awards."""
        if 'Awards' not in player_row or pd.isna(player_row['Awards']):
            return 0.0
        
        awards_str = str(player_row['Awards'])
        bonus = 0.0
        
        # Award values
        award_values = {
            'MVP': 1.0,
            'Finals MVP': 0.9,
            'DPOY': 0.7,
            'All-NBA-1': 0.6,
            'All-NBA-2': 0.4,
            'All-NBA-3': 0.3,
            'All-Star': 0.2,
            'All-Defensive-1': 0.3,
            'All-Defensive-2': 0.2
        }
        
        for award, value in award_values.items():
            if award in awards_str:
                bonus += value
        
        return min(bonus, 1.0)  # Cap at 1.0
        
    def calculate_playing_time_factor(self, player_row):
        """Calculate reliability factor based on playing time."""
        games_started = player_row.get('GS', 0)
        minutes_played = player_row.get('MP', 0)
        games_played = player_row.get('G', 0)
        
        # Games started factor (0-1)
        if games_played > 0:
            start_rate = games_started / games_played
        else:
            start_rate = 0
        
        # Minutes factor (0-1, normalized to 2500 minutes as excellent)
        minutes_factor = min(minutes_played / 2500, 1.0)
        
        # Combine
        playing_time_factor = (
            start_rate * self.playing_time_weights['games_started'] +
            minutes_factor * self.playing_time_weights['minutes_played']
        )
        
        # Minimum threshold penalty
        if games_played < self.min_games or minutes_played < self.min_minutes:
            playing_time_factor *= 0.5
        
        return playing_time_factor
    
    def normalize_metrics(self):
        """Normalize all metrics using z-scores."""
        print("Normalizing metrics...")
        
        metrics_to_normalize = list(self.metric_weights.keys())
        
        for metric in metrics_to_normalize:
            if metric in self.combined_data.columns:
                values = self.combined_data[metric].replace([np.inf, -np.inf], np.nan)
                mean = values.mean()
                std = values.std()
                
                if std > 0:
                    self.combined_data[f'{metric}_zscore'] = (values - mean) / std
                else:
                    self.combined_data[f'{metric}_zscore'] = 0
        
        print("Metrics normalized\n")
    
    def calculate_composite_score(self):
        """Calculate enhanced composite score."""
        print("Calculating composite scores...")
        
        scores = []
        
        for idx, player_row in self.combined_data.iterrows():
            # Base score from weighted metrics
            base_score = 0.0
            
            for metric, weight in self.metric_weights.items():
                zscore_col = f'{metric}_zscore'
                if zscore_col in self.combined_data.columns:
                    zscore = player_row[zscore_col]
                    if pd.notna(zscore):
                        base_score += zscore * weight
            
            # Playing time factor
            playing_time_factor = self.calculate_playing_time_factor(player_row)
            
            # Awards bonus
            awards_bonus = self.calculate_awards_bonus(player_row)
            
            # Playoff bonus (additional boost if played playoffs)
            playoff_bonus = 0.0
            if player_row.get('Has_Playoff_Data', False):
                playoff_games = player_row.get('Playoff_Games', 0)
                # Bonus scales with playoff games (max 0.2 at 20+ games)
                playoff_bonus = min(playoff_games / 100, 0.2)
            
            # Final composite score
            composite_score = (
                base_score * playing_time_factor * (1 + awards_bonus * self.awards_weight) +
                playoff_bonus
            )
            
            scores.append(composite_score)
        
        self.combined_data['composite_score'] = scores
        print("Composite scores calculated\n")
    
    def simulate_head_to_head(self, player1, player2):
        """Simulate head-to-head matchup between two players."""
        # Get key stats
        p1_stats = {
            'PER': player1.get('PER', 15),
            'BPM': player1.get('BPM', 0),
            'VORP': player1.get('VORP', 0),
            'WS': player1.get('WS', 0),
            'composite': player1.get('composite_score', 0)
        }
        
        p2_stats = {
            'PER': player2.get('PER', 15),
            'BPM': player2.get('BPM', 0),
            'VORP': player2.get('VORP', 0),
            'WS': player2.get('WS', 0),
            'composite': player2.get('composite_score', 0)
        }
        
        # Run simulations
        p1_wins = 0
        num_sims = 500
        
        for _ in range(num_sims):
            # Add randomness
            p1_score = (
                p1_stats['composite'] +
                random.gauss(0, 0.5)  # Random variation
            )
            p2_score = (
                p2_stats['composite'] +
                random.gauss(0, 0.5)
            )
            
            if p1_score > p2_score:
                p1_wins += 1
        
        return p1_wins / num_sims
    
    def calculate_h2h_win_rates(self, top_n=150):
        """Calculate head-to-head win rates for top players."""
        print(f"Calculating H2H win rates for top {top_n} players...")
        
        # Get top players by composite score
        top_players = self.combined_data.nlargest(top_n, 'composite_score')
        
        # Calculate win rates
        win_rates = {}
        
        for idx, player in top_players.iterrows():
            player_name = player['Player']
            wins = []
            
            # Simulate against all other top players
            for idx2, opponent in top_players.iterrows():
                if idx != idx2:
                    win_prob = self.simulate_head_to_head(player, opponent)
                    wins.append(win_prob)
            
            # Average win rate
            win_rates[player_name] = np.mean(wins) if wins else 0.5
        
        # Add to dataframe
        self.combined_data['h2h_win_rate'] = self.combined_data['Player'].map(win_rates)
        self.combined_data['h2h_win_rate'].fillna(0.5, inplace=True)
        
        print("H2H win rates calculated\n")
    
    def calculate_final_score(self):
        """Calculate final ranking score."""
        print("Calculating final scores...")
        
        # Normalize composite and h2h
        comp_mean = self.combined_data['composite_score'].mean()
        comp_std = self.combined_data['composite_score'].std()
        
        self.combined_data['composite_norm'] = (
            (self.combined_data['composite_score'] - comp_mean) / comp_std
        )
        
        h2h_mean = self.combined_data['h2h_win_rate'].mean()
        h2h_std = self.combined_data['h2h_win_rate'].std()
        
        self.combined_data['h2h_norm'] = (
            (self.combined_data['h2h_win_rate'] - h2h_mean) / h2h_std
        )
        
        # Final score: 80% composite, 20% H2H
        self.combined_data['final_score'] = (
            self.combined_data['composite_norm'] * 0.80 +
            self.combined_data['h2h_norm'] * 0.20
        )
        
        print("Final scores calculated\n")
    
    def remove_duplicates(self):
        """Remove duplicate player entries, keeping only current season."""
        print("Removing duplicate players...")
        
        initial_count = len(self.combined_data)
        
        # Keep only unique players (first occurrence)
        self.combined_data = self.combined_data.drop_duplicates(
            subset=['Player'], 
            keep='first'
        )
        
        removed = initial_count - len(self.combined_data)
        print(f"Removed {removed} duplicate entries\n")
    
    def add_ringer_comparison(self):
        """Add Ringer rankings for comparison."""
        if self.ringer_rankings.empty:
            self.combined_data['ringer_rank'] = np.nan
            return
        
        print("Adding Ringer rankings comparison...")
        
        # Create mapping
        ringer_map = {}
        for idx, row in self.ringer_rankings.iterrows():
            player_name = row.get('Player', row.get('player', ''))
            rank = row.get('Rank', row.get('rank', idx + 1))
            ringer_map[player_name] = rank
        
        self.combined_data['ringer_rank'] = self.combined_data['Player'].map(ringer_map)
        
        matched = self.combined_data['ringer_rank'].notna().sum()
        print(f"Matched {matched} players with Ringer rankings\n")
    
    def generate_rankings(self):
        """Generate complete rankings."""
        # Load data
        self.load_data()
        
        # Combine regular and playoff
        self.combine_season_data()
        
        # Remove duplicates first
        self.remove_duplicates()
        
        # Calculate metrics
        self.normalize_metrics()
        self.calculate_composite_score()
        self.calculate_h2h_win_rates()
        self.calculate_final_score()
        
        # Add comparisons
        self.add_ringer_comparison()
        
        # Sort and rank
        self.combined_data = self.combined_data.sort_values(
            'final_score', 
            ascending=False
        ).reset_index(drop=True)
        
        self.combined_data['rank'] = range(1, len(self.combined_data) + 1)
        
        return self.combined_data
    
    def export_rankings(self):
        """Export rankings to files."""
        print("Exporting rankings...")
        
        # Select columns for export
        export_cols = [
            'rank', 'Player', 'Team', 'Pos', 'G', 'GS', 'MP',
            'PER', 'BPM', 'VORP', 'WS', 'WS/48', 'TS%',
            'composite_score', 'h2h_win_rate', 'final_score',
            'Has_Playoff_Data', 'Playoff_Games',
            'ringer_rank'
        ]
        
        # Filter to available columns
        available_cols = [col for col in export_cols if col in self.combined_data.columns]
        export_df = self.combined_data[available_cols].copy()
        
        # Main rankings file
        output_file = f"{self.data_dir}/player_rankings_{self.current_season}_final.csv"
        export_df.to_csv(output_file, index=False)
        print(f"Saved: {output_file}")
        
        # Top 100 JSON
        top_100 = export_df.head(100).to_dict('records')
        json_file = f"{self.data_dir}/player_rankings_top100_{self.current_season}_final.json"
        
        with open(json_file, 'w') as f:
            json.dump({
                'generated_at': datetime.now().isoformat(),
                'season': self.current_season,
                'methodology': 'Enhanced weighting: PER, WS, BPM, VORP, Awards, Playoff performance',
                'rankings': top_100
            }, f, indent=2)
        
        print(f"Saved: {json_file}")
        
        # Summary
        print(f"\nTop 10 Players:")
        for _, row in export_df.head(10).iterrows():
            try:
                print(f"  #{row['rank']:2d} {row['Player']:25s} - Score: {row['final_score']:.2f}")
            except UnicodeEncodeError:
                player_name = row['Player'].encode('ascii', 'replace').decode('ascii')
                print(f"  #{row['rank']:2d} {player_name:25s} - Score: {row['final_score']:.2f}")
        
        print(f"\nTotal players ranked: {len(export_df)}")


def main():
    """Main execution."""
    print("="*70)
    print("FINAL PLAYER RANKINGS SYSTEM")
    print("Enhanced Weighting + No Duplicates")
    print("="*70 + "\n")
    
    ranker = FinalPlayerRankings()
    rankings = ranker.generate_rankings()
    ranker.export_rankings()
    
    print("\n" + "="*70)
    print("RANKINGS COMPLETE")
    print("="*70)


if __name__ == '__main__':
    main()
