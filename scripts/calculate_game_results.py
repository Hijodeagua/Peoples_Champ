"""
Calculate Game Results

Takes user's head-to-head choices and generates:
1. User's final rankings
2. Comparison with ELO/H2H model rankings
3. Comparison with Ringer Top 100
4. Results data for display
"""

import pandas as pd
import numpy as np
from collections import defaultdict
import json


class GameResultsCalculator:
    """Calculate game results from user choices."""
    
    def __init__(self, rankings_file='data/player_rankings_24-25_final.csv'):
        self.rankings_file = rankings_file
        self.load_rankings()
        
    def load_rankings(self):
        """Load model rankings."""
        print(f"Loading rankings from {self.rankings_file}...")
        self.rankings = pd.read_csv(self.rankings_file)
        print(f"Loaded {len(self.rankings)} players\n")
        
    def calculate_user_rankings(self, user_choices):
        """
        Calculate user rankings from head-to-head choices.
        
        Args:
            user_choices: List of dicts with 'winner' and 'loser' keys
                         e.g., [{'winner': 'Nikola Jokić', 'loser': 'Giannis Antetokounmpo'}, ...]
        
        Returns:
            DataFrame with user rankings
        """
        print("Calculating user rankings from choices...")
        
        # Get unique players from choices
        players = set()
        for choice in user_choices:
            players.add(choice['winner'])
            players.add(choice['loser'])
        
        # Initialize win counts
        win_counts = defaultdict(int)
        total_matchups = defaultdict(int)
        
        # Count wins
        for choice in user_choices:
            winner = choice['winner']
            loser = choice['loser']
            
            win_counts[winner] += 1
            total_matchups[winner] += 1
            total_matchups[loser] += 1
        
        # Calculate win rates
        win_rates = {}
        for player in players:
            if total_matchups[player] > 0:
                win_rates[player] = win_counts[player] / total_matchups[player]
            else:
                win_rates[player] = 0.0
        
        # Create rankings based on win rate
        user_rankings = []
        for player, win_rate in sorted(win_rates.items(), key=lambda x: x[1], reverse=True):
            # Get player data from model rankings
            player_data = self.rankings[self.rankings['Player'] == player]
            
            if not player_data.empty:
                row = player_data.iloc[0]
                user_rankings.append({
                    'player': player,
                    'team': row['Team'],
                    'user_rank': len(user_rankings) + 1,
                    'user_win_rate': win_rate,
                    'user_score': win_rate * 100,  # Convert to 0-100 scale
                    'elo_rank': int(row['rank']),
                    'elo_score': float(row['final_score']),
                    'h2h_win_rate': float(row['h2h_win_rate']),
                    'ringer_rank': int(row['ringer_rank']) if pd.notna(row['ringer_rank']) else None,
                    'bpm': float(row['BPM']) if pd.notna(row['BPM']) else 0.0,
                    'per': float(row['PER']) if pd.notna(row['PER']) else 0.0,
                    'vorp': float(row['VORP']) if pd.notna(row['VORP']) else 0.0
                })
        
        user_df = pd.DataFrame(user_rankings)
        print(f"Calculated rankings for {len(user_df)} players\n")
        
        return user_df
    
    def generate_results_json(self, user_rankings_df, output_file='data/game_results.json'):
        """Generate JSON file for results display."""
        print("Generating results JSON...")
        
        results = {
            'userRankings': []
        }
        
        for _, row in user_rankings_df.iterrows():
            results['userRankings'].append({
                'rank': int(row['user_rank']),
                'player': row['player'],
                'team': row['team'],
                'score': float(row['user_score']),
                'eloRank': int(row['elo_rank']),
                'eloScore': float(row['elo_score']),
                'ringerRank': int(row['ringer_rank']) if pd.notna(row['ringer_rank']) else None,
                'bpm': float(row['bpm']),
                'per': float(row['per']),
                'vorp': float(row['vorp'])
            })
        
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"Saved: {output_file}\n")
        return results
    
    def print_results_summary(self, user_rankings_df):
        """Print summary of results."""
        print("="*70)
        print("GAME RESULTS SUMMARY")
        print("="*70 + "\n")
        
        print("YOUR TOP 5:")
        for _, row in user_rankings_df.head(5).iterrows():
            elo_diff = row['user_rank'] - row['elo_rank']
            elo_diff_str = f"+{elo_diff}" if elo_diff > 0 else f"{elo_diff}"
            
            ringer_str = f"#{int(row['ringer_rank'])}" if pd.notna(row['ringer_rank']) else "N/A"
            
            try:
                print(f"  #{int(row['user_rank'])} {row['player']:25s} "
                      f"(ELO: #{int(row['elo_rank'])} {elo_diff_str:>4s}, "
                      f"Ringer: {ringer_str:>4s})")
            except UnicodeEncodeError:
                player_name = row['player'].encode('ascii', 'replace').decode('ascii')
                print(f"  #{int(row['user_rank'])} {player_name:25s} "
                      f"(ELO: #{int(row['elo_rank'])} {elo_diff_str:>4s}, "
                      f"Ringer: {ringer_str:>4s})")
        
        print("\nCOMPARISON STATS:")
        
        # Calculate agreement metrics
        exact_matches = (user_rankings_df['user_rank'] == user_rankings_df['elo_rank']).sum()
        within_1 = (abs(user_rankings_df['user_rank'] - user_rankings_df['elo_rank']) <= 1).sum()
        within_2 = (abs(user_rankings_df['user_rank'] - user_rankings_df['elo_rank']) <= 2).sum()
        
        print(f"  Exact matches with ELO: {exact_matches}/{len(user_rankings_df)}")
        print(f"  Within 1 rank: {within_1}/{len(user_rankings_df)}")
        print(f"  Within 2 ranks: {within_2}/{len(user_rankings_df)}")
        
        # Average difference
        avg_diff = abs(user_rankings_df['user_rank'] - user_rankings_df['elo_rank']).mean()
        print(f"  Average rank difference: {avg_diff:.2f}")
        
        print("\n" + "="*70)


def example_usage():
    """Example of how to use the calculator."""
    
    # Example user choices from a game
    # In real implementation, this would come from the game interface
    user_choices = [
        {'winner': 'Nikola Jokić', 'loser': 'Shai Gilgeous-Alexander'},
        {'winner': 'Nikola Jokić', 'loser': 'Giannis Antetokounmpo'},
        {'winner': 'Nikola Jokić', 'loser': 'Stephen Curry'},
        {'winner': 'Nikola Jokić', 'loser': 'Luka Dončić'},
        {'winner': 'Shai Gilgeous-Alexander', 'loser': 'Giannis Antetokounmpo'},
        {'winner': 'Shai Gilgeous-Alexander', 'loser': 'Stephen Curry'},
        {'winner': 'Shai Gilgeous-Alexander', 'loser': 'Luka Dončić'},
        {'winner': 'Giannis Antetokounmpo', 'loser': 'Stephen Curry'},
        {'winner': 'Giannis Antetokounmpo', 'loser': 'Luka Dončić'},
        {'winner': 'Stephen Curry', 'loser': 'Luka Dončić'}
    ]
    
    # Calculate results
    calculator = GameResultsCalculator()
    user_rankings = calculator.calculate_user_rankings(user_choices)
    
    # Generate JSON for display
    results = calculator.generate_results_json(user_rankings)
    
    # Print summary
    calculator.print_results_summary(user_rankings)
    
    return user_rankings, results


if __name__ == '__main__':
    example_usage()
