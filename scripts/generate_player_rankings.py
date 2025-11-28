"""
Player Ranking System using Basketball Reference Advanced Stats

This script generates comprehensive player rankings using:
1. Historical performance data (2021-2026)
2. Head-to-head simulation matchups
3. Multiple ranking methodologies
4. Integration with Ringer Top 100 rankings

Methodology:
- Composite Score: Weighted combination of key advanced metrics
- Head-to-Head Simulations: Monte Carlo simulations of player matchups
- Historical Trajectory: Multi-year performance trends
- Position-Adjusted Rankings: Normalized by position
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import json
from datetime import datetime

class PlayerRankingSystem:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.current_season = "25-26"
        self.historical_seasons = ["21-22", "22-23", "23-24", "24-25"]
        
        # Metric weights for composite score
        self.metric_weights = {
            'PER': 0.15,      # Player Efficiency Rating
            'BPM': 0.20,      # Box Plus/Minus (overall impact)
            'VORP': 0.20,     # Value Over Replacement Player
            'WS/48': 0.15,    # Win Shares per 48 minutes
            'TS%': 0.10,      # True Shooting %
            'USG%': 0.05,     # Usage Rate
            'OBPM': 0.075,    # Offensive BPM
            'DBPM': 0.075,    # Defensive BPM
        }
        
        # Playing time reliability thresholds
        self.min_minutes_threshold = 500  # Minimum minutes for full weight
        self.min_games_started_threshold = 20  # Minimum starts for full weight
        
        # Load all data
        self.current_players = self.load_current_season()
        self.historical_data = self.load_historical_data()
        self.ringer_rankings = self.load_ringer_rankings()
        
    def load_current_season(self) -> pd.DataFrame:
        """Load current season (25-26) player data"""
        file_path = self.data_dir / f"Bbref_Adv_{self.current_season}.csv"
        df = pd.read_csv(file_path)
        
        # Clean data
        df = df[df['Player'] != 'League Average']
        
        # Convert percentage strings to floats
        pct_cols = ['TS%', '3PAr', 'FTr', 'ORB%', 'DRB%', 'TRB%', 'AST%', 'STL%', 'BLK%', 'TOV%', 'USG%', 'WS/48']
        for col in pct_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Filter for minimum games played (at least 10 games)
        df = df[df['G'] >= 10].copy()
        
        return df
    
    def load_historical_data(self) -> Dict[str, pd.DataFrame]:
        """Load historical season data"""
        historical = {}
        for season in self.historical_seasons:
            file_path = self.data_dir / f"Bbref_Adv_{season}.csv"
            if file_path.exists():
                df = pd.read_csv(file_path)
                df = df[df['Player'] != 'League Average']
                historical[season] = df
        return historical
    
    def load_ringer_rankings(self) -> pd.DataFrame:
        """Load Ringer Top 100 rankings"""
        file_path = self.data_dir / "ringer_top_100.csv"
        if file_path.exists():
            return pd.read_csv(file_path)
        return pd.DataFrame()
    
    def calculate_playing_time_factor(self, player_row: pd.Series) -> float:
        """
        Calculate playing time reliability factor (0.0 to 1.0)
        
        Penalizes players with limited minutes or games started
        This helps filter out small sample size outliers
        """
        minutes = player_row.get('MP', 0)
        games_started = player_row.get('GS', 0)
        
        # Minutes factor (sigmoid curve)
        # Full weight at 500+ minutes, scales down below that
        minutes_factor = min(1.0, minutes / self.min_minutes_threshold)
        
        # Games started factor (sigmoid curve)
        # Full weight at 20+ starts, scales down below that
        starts_factor = min(1.0, games_started / self.min_games_started_threshold)
        
        # Combined factor (weighted average: 60% minutes, 40% starts)
        playing_time_factor = (minutes_factor * 0.6) + (starts_factor * 0.4)
        
        # Apply a minimum floor of 0.3 so players aren't completely eliminated
        return max(0.3, playing_time_factor)
    
    def calculate_composite_score(self, player_row: pd.Series) -> float:
        """
        Calculate composite score based on weighted advanced metrics
        
        Formula: Σ(normalized_metric * weight) * playing_time_factor
        Normalization: z-score within current season
        """
        score = 0.0
        
        for metric, weight in self.metric_weights.items():
            if metric in player_row.index and pd.notna(player_row[metric]):
                # Get league average and std dev for normalization
                league_mean = self.current_players[metric].mean()
                league_std = self.current_players[metric].std()
                
                if league_std > 0:
                    # Calculate z-score
                    z_score = (player_row[metric] - league_mean) / league_std
                    score += z_score * weight
        
        # Apply playing time reliability factor
        playing_time_factor = self.calculate_playing_time_factor(player_row)
        score *= playing_time_factor
        
        return score
    
    def calculate_historical_trajectory(self, player_name: str) -> float:
        """
        Calculate player's performance trajectory over past seasons
        
        Returns: Trend coefficient (positive = improving, negative = declining)
        """
        player_history = []
        
        for season in self.historical_seasons:
            if season in self.historical_data:
                df = self.historical_data[season]
                player_data = df[df['Player'] == player_name]
                
                if not player_data.empty:
                    # Use BPM as primary trajectory metric
                    bpm = player_data['BPM'].iloc[0]
                    if pd.notna(bpm):
                        player_history.append(bpm)
        
        if len(player_history) >= 2:
            # Calculate linear trend
            x = np.arange(len(player_history))
            coefficients = np.polyfit(x, player_history, 1)
            return coefficients[0]  # Slope of trend line
        
        return 0.0
    
    def simulate_head_to_head(self, player1: pd.Series, player2: pd.Series, 
                              n_simulations: int = 1000) -> float:
        """
        Simulate head-to-head matchup between two players
        
        Returns: Win probability for player1 (0.0 to 1.0)
        
        Simulation factors:
        - Offensive impact (PER, OBPM, TS%, USG%)
        - Defensive impact (DBPM, STL%, BLK%)
        - Overall value (BPM, VORP, WS/48)
        - Variance based on consistency metrics
        """
        
        # Calculate offensive scores
        p1_offense = (
            player1.get('PER', 15) * 0.3 +
            player1.get('OBPM', 0) * 5 +
            player1.get('TS%', 0.55) * 50 +
            player1.get('USG%', 0.20) * 20
        )
        
        p2_offense = (
            player2.get('PER', 15) * 0.3 +
            player2.get('OBPM', 0) * 5 +
            player2.get('TS%', 0.55) * 50 +
            player2.get('USG%', 0.20) * 20
        )
        
        # Calculate defensive scores
        p1_defense = (
            player1.get('DBPM', 0) * 5 +
            player1.get('STL%', 0.01) * 100 +
            player1.get('BLK%', 0.01) * 100
        )
        
        p2_defense = (
            player2.get('DBPM', 0) * 5 +
            player2.get('STL%', 0.01) * 100 +
            player2.get('BLK%', 0.01) * 100
        )
        
        # Calculate overall impact
        p1_impact = (
            player1.get('BPM', 0) * 2 +
            player1.get('VORP', 0) * 5 +
            player1.get('WS/48', 0.1) * 50
        )
        
        p2_impact = (
            player2.get('BPM', 0) * 2 +
            player2.get('VORP', 0) * 5 +
            player2.get('WS/48', 0.1) * 50
        )
        
        # Combined scores
        p1_total = p1_offense + p1_defense + p1_impact
        p2_total = p2_offense + p2_defense + p2_impact
        
        # Add variance for simulation
        p1_std = abs(p1_total) * 0.15  # 15% variance
        p2_std = abs(p2_total) * 0.15
        
        # Run simulations
        p1_wins = 0
        for _ in range(n_simulations):
            p1_sim = np.random.normal(p1_total, p1_std)
            p2_sim = np.random.normal(p2_total, p2_std)
            
            if p1_sim > p2_sim:
                p1_wins += 1
        
        return p1_wins / n_simulations
    
    def generate_head_to_head_matrix(self, top_n: int = 100) -> pd.DataFrame:
        """
        Generate head-to-head win probability matrix for top N players
        """
        # Get top players by composite score
        self.current_players['composite_score'] = self.current_players.apply(
            self.calculate_composite_score, axis=1
        )
        top_players = self.current_players.nlargest(top_n, 'composite_score')
        
        # Initialize matrix
        n_players = len(top_players)
        h2h_matrix = np.zeros((n_players, n_players))
        
        print(f"\nGenerating head-to-head matchup matrix for {n_players} players...")
        
        # Calculate all matchups
        for i, (idx1, player1) in enumerate(top_players.iterrows()):
            for j, (idx2, player2) in enumerate(top_players.iterrows()):
                if i != j:
                    win_prob = self.simulate_head_to_head(player1, player2, n_simulations=500)
                    h2h_matrix[i, j] = win_prob
                else:
                    h2h_matrix[i, j] = 0.5  # 50% against self
            
            if (i + 1) % 10 == 0:
                print(f"  Completed {i + 1}/{n_players} players...")
        
        # Create DataFrame
        player_names = top_players['Player'].tolist()
        h2h_df = pd.DataFrame(h2h_matrix, index=player_names, columns=player_names)
        
        return h2h_df, top_players
    
    def calculate_elo_ratings(self, h2h_matrix: pd.DataFrame, 
                             initial_rating: float = 1500.0,
                             k_factor: float = 32.0) -> Dict[str, float]:
        """
        Calculate Elo ratings based on head-to-head win probabilities
        """
        players = h2h_matrix.index.tolist()
        ratings = {player: initial_rating for player in players}
        
        # Iterate through all matchups
        for i, player1 in enumerate(players):
            for j, player2 in enumerate(players):
                if i != j:
                    # Get win probability
                    win_prob = h2h_matrix.loc[player1, player2]
                    
                    # Expected score based on current ratings
                    expected_score = 1 / (1 + 10 ** ((ratings[player2] - ratings[player1]) / 400))
                    
                    # Update rating
                    ratings[player1] += k_factor * (win_prob - expected_score)
        
        return ratings
    
    def generate_rankings(self) -> pd.DataFrame:
        """
        Generate comprehensive player rankings
        """
        print("\n" + "="*80)
        print("GENERATING PLAYER RANKINGS")
        print("="*80)
        
        # Calculate playing time factors
        print("\n1. Calculating playing time reliability factors...")
        self.current_players['playing_time_factor'] = self.current_players.apply(
            self.calculate_playing_time_factor, axis=1
        )
        
        # Calculate composite scores
        print("2. Calculating composite scores...")
        self.current_players['composite_score'] = self.current_players.apply(
            self.calculate_composite_score, axis=1
        )
        
        # Calculate historical trajectories
        print("3. Analyzing historical trajectories...")
        self.current_players['trajectory'] = self.current_players['Player'].apply(
            self.calculate_historical_trajectory
        )
        
        # Generate head-to-head matrix
        print("4. Running head-to-head simulations...")
        h2h_matrix, top_players = self.generate_head_to_head_matrix(top_n=150)
        
        # Calculate Elo ratings
        print("5. Computing Elo ratings...")
        elo_ratings = self.calculate_elo_ratings(h2h_matrix)
        
        # Calculate head-to-head win rate
        print("6. Calculating overall win rates...")
        h2h_win_rates = {}
        for player in h2h_matrix.index:
            win_rate = h2h_matrix.loc[player].mean()
            h2h_win_rates[player] = win_rate
        
        # Merge all rankings
        rankings_df = self.current_players.copy()
        rankings_df['elo_rating'] = rankings_df['Player'].map(elo_ratings)
        rankings_df['h2h_win_rate'] = rankings_df['Player'].map(h2h_win_rates)
        
        # Calculate final ranking score
        rankings_df['final_score'] = (
            rankings_df['composite_score'] * 0.40 +
            rankings_df['elo_rating'].fillna(1500) / 1500 * 0.35 +
            rankings_df['h2h_win_rate'].fillna(0.5) * 100 * 0.20 +
            rankings_df['trajectory'].fillna(0) * 0.05
        )
        
        # Add Ringer ranking if available
        if not self.ringer_rankings.empty:
            ringer_map = dict(zip(
                self.ringer_rankings['Player'],
                self.ringer_rankings['Rank']
            ))
            rankings_df['ringer_rank'] = rankings_df['Player'].map(ringer_map)
        
        # Sort by final score
        rankings_df = rankings_df.sort_values('final_score', ascending=False)
        rankings_df['rank'] = range(1, len(rankings_df) + 1)
        
        return rankings_df
    
    def export_rankings(self, rankings_df: pd.DataFrame, output_dir: str = "data"):
        """
        Export rankings to various formats
        """
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Select key columns for export
        export_cols = [
            'rank', 'Player', 'Team', 'Pos', 'Age', 'G', 'GS', 'MP',
            'final_score', 'composite_score', 'playing_time_factor', 
            'elo_rating', 'h2h_win_rate',
            'PER', 'BPM', 'VORP', 'WS/48', 'TS%',
            'trajectory', 'ringer_rank'
        ]
        
        export_df = rankings_df[[col for col in export_cols if col in rankings_df.columns]]
        
        # Export to CSV
        csv_path = output_path / "player_rankings_2025-26.csv"
        export_df.to_csv(csv_path, index=False)
        print(f"\n[OK] Rankings exported to: {csv_path}")
        
        # Export top 100 to JSON
        top_100 = export_df.head(100).to_dict('records')
        json_path = output_path / "player_rankings_top100.json"
        with open(json_path, 'w') as f:
            json.dump({
                'generated_at': datetime.now().isoformat(),
                'methodology': 'Composite scoring with head-to-head simulations',
                'rankings': top_100
            }, f, indent=2)
        print(f"[OK] Top 100 exported to: {json_path}")
        
        # Export summary statistics
        summary = {
            'total_players': len(rankings_df),
            'top_10': export_df.head(10)[['rank', 'Player', 'Team', 'final_score']].to_dict('records'),
            'methodology': {
                'composite_score_weight': 0.40,
                'elo_rating_weight': 0.35,
                'h2h_win_rate_weight': 0.20,
                'trajectory_weight': 0.05,
            },
            'metric_weights': self.metric_weights
        }
        
        summary_path = output_path / "rankings_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"[OK] Summary exported to: {summary_path}")
        
        return export_df
    
    def print_rankings_report(self, rankings_df: pd.DataFrame, top_n: int = 50):
        """
        Print formatted rankings report
        """
        print("\n" + "="*80)
        print(f"TOP {top_n} PLAYER RANKINGS - 2025-26 SEASON")
        print("="*80)
        print(f"\n{'Rank':<6}{'Player':<25}{'Team':<6}{'MP':<6}{'Score':<8}{'BPM':<7}{'VORP':<7}")
        print("-" * 80)
        
        for idx, row in rankings_df.head(top_n).iterrows():
            rank = int(row['rank'])
            # Handle Unicode characters in player names
            player = row['Player'][:24].encode('ascii', 'replace').decode('ascii')
            team = row['Team']
            mp = int(row['MP']) if pd.notna(row['MP']) else 0
            score = f"{row['final_score']:.2f}"
            bpm = f"{row['BPM']:.1f}" if pd.notna(row['BPM']) else "N/A"
            vorp = f"{row['VORP']:.1f}" if pd.notna(row['VORP']) else "N/A"
            
            print(f"{rank:<6}{player:<25}{team:<6}{mp:<6}{score:<8}{bpm:<7}{vorp:<7}")
        
        print("\n" + "="*80)
        print("METHODOLOGY SUMMARY")
        print("="*80)
        print("""
Final Score Calculation:
  • Composite Score (40%): Weighted combination of PER, BPM, VORP, WS/48, TS%, etc.
    - Adjusted by Playing Time Factor (MP & GS) to penalize small samples
  • Elo Rating (35%): Based on simulated head-to-head matchups
  • H2H Win Rate (20%): Average win probability vs all other players
  • Historical Trajectory (5%): Performance trend over past 4 seasons

Playing Time Reliability Factor:
  • Full weight at 500+ minutes and 20+ games started
  • Scales down linearly below thresholds (60% minutes, 40% starts)
  • Minimum floor of 0.3 to avoid complete elimination
  • Helps filter out small sample size outliers

Head-to-Head Simulation:
  • 500 Monte Carlo simulations per matchup
  • Factors: Offensive impact, Defensive impact, Overall value
  • Variance: 15% standard deviation based on player consistency

Composite Score Weights:
  • BPM (20%), VORP (20%), PER (15%), WS/48 (15%), TS% (10%)
  • OBPM (7.5%), DBPM (7.5%), USG% (5%)
  
Note: Only players from 2025-26 season are ranked (no historical duplicates)
        """)


def main():
    """
    Main execution function
    """
    print("\n" + "="*80)
    print("PLAYER RANKING SYSTEM - 2025-26 NBA SEASON")
    print("="*80)
    
    # Initialize system
    ranking_system = PlayerRankingSystem(data_dir="data")
    
    # Generate rankings
    rankings_df = ranking_system.generate_rankings()
    
    # Export results
    export_df = ranking_system.export_rankings(rankings_df)
    
    # Print report
    ranking_system.print_rankings_report(rankings_df, top_n=50)
    
    print("\n" + "="*80)
    print("RANKING GENERATION COMPLETE")
    print("="*80)
    print(f"\nTotal players ranked: {len(rankings_df)}")
    print(f"Files generated in: data/")
    print("  • player_rankings_2025-26.csv")
    print("  • player_rankings_top100.json")
    print("  • rankings_summary.json")
    print("\n")


if __name__ == "__main__":
    main()
