"""
Enhanced Player Ranking System v2.0
=====================================

Key Improvements:
1. Multi-year player tracking (shows same player across different seasons)
2. Playoff performance weighted more heavily (2x weight for playoff stats)
3. Simulated H2H win percentage as primary ranking component
4. Removed Elo rating redundancy (H2H win rate is more direct)
5. Playing time factors weigh heavier in playoffs (GP, GS, MP)

Methodology:
- Composite Score (50%): Weighted combination of advanced metrics
- H2H Win Rate (40%): Direct head-to-head simulation results
- Historical Trajectory (10%): Multi-year performance trends
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import json
from datetime import datetime

class EnhancedPlayerRankingSystem:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.seasons = ["21-22", "22-23", "23-24", "24-25", "25-26"]
        
        # Metric weights for composite score
        self.metric_weights = {
            'PER': 0.15,
            'BPM': 0.20,
            'VORP': 0.20,
            'WS/48': 0.15,
            'TS%': 0.10,
            'USG%': 0.05,
            'OBPM': 0.075,
            'DBPM': 0.075,
        }
        
        # Playoff multiplier for playing time importance
        self.playoff_weight_multiplier = 2.0
        
        # Load all data (regular season + playoffs)
        self.regular_season_data = self.load_all_regular_season_data()
        self.playoff_data = self.load_all_playoff_data()
        self.combined_data = self.combine_regular_and_playoff_data()
        self.ringer_rankings = self.load_ringer_rankings()
        
    def load_all_regular_season_data(self) -> Dict[str, pd.DataFrame]:
        """Load all regular season data"""
        data = {}
        for season in self.seasons:
            file_path = self.data_dir / f"Bbref_Adv_{season}.csv"
            if file_path.exists():
                df = pd.read_csv(file_path)
                df = df[df['Player'] != 'League Average']
                df['Season'] = season
                df['Season_Type'] = 'Regular'
                
                # Convert percentage strings to floats
                pct_cols = ['TS%', '3PAr', 'FTr', 'ORB%', 'DRB%', 'TRB%', 
                           'AST%', 'STL%', 'BLK%', 'TOV%', 'USG%', 'WS/48']
                for col in pct_cols:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                
                data[season] = df
        return data
    
    def load_all_playoff_data(self) -> Dict[str, pd.DataFrame]:
        """Load all playoff data"""
        data = {}
        for season in self.seasons:
            file_path = self.data_dir / f"Bbref_Playoff_Adv_{season}.csv"
            if file_path.exists():
                df = pd.read_csv(file_path)
                df = df[df['Player'] != 'League Average']
                df['Season'] = season
                df['Season_Type'] = 'Playoff'
                
                # Convert percentage strings to floats
                pct_cols = ['TS%', '3PAr', 'FTr', 'ORB%', 'DRB%', 'TRB%', 
                           'AST%', 'STL%', 'BLK%', 'TOV%', 'USG%', 'WS/48']
                for col in pct_cols:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                
                data[season] = df
        return data
    
    def combine_regular_and_playoff_data(self) -> pd.DataFrame:
        """
        Combine regular season and playoff data with weighted averaging
        Playoff stats get 2x weight due to higher competition level
        """
        all_data = []
        
        for season in self.seasons:
            # Get regular season data
            reg_df = self.regular_season_data.get(season)
            playoff_df = self.playoff_data.get(season)
            
            if reg_df is not None:
                for _, player_row in reg_df.iterrows():
                    player_name = player_row['Player']
                    
                    # Check if player has playoff data
                    playoff_row = None
                    if playoff_df is not None:
                        playoff_match = playoff_df[playoff_df['Player'] == player_name]
                        if not playoff_match.empty:
                            playoff_row = playoff_match.iloc[0]
                    
                    # Combine stats with playoff weighting
                    combined_row = self.weighted_combine_stats(
                        player_row, playoff_row, season
                    )
                    all_data.append(combined_row)
        
        return pd.DataFrame(all_data)
    
    def weighted_combine_stats(self, reg_row: pd.Series, 
                               playoff_row: pd.Series = None,
                               season: str = None) -> Dict:
        """
        Combine regular season and playoff stats with weighted averaging
        Playoff minutes/games get 2x weight in playing time calculations
        """
        combined = {}
        
        # Basic info
        combined['Player'] = reg_row['Player']
        combined['Season'] = season
        combined['Team'] = reg_row.get('Team', '')
        combined['Pos'] = reg_row.get('Pos', '')
        combined['Age'] = reg_row.get('Age', 0)
        
        # Playing time stats (playoff weighted 2x)
        reg_g = reg_row.get('G', 0)
        reg_gs = reg_row.get('GS', 0)
        reg_mp = reg_row.get('MP', 0)
        
        if playoff_row is not None:
            playoff_g = playoff_row.get('G', 0) * self.playoff_weight_multiplier
            playoff_gs = playoff_row.get('GS', 0) * self.playoff_weight_multiplier
            playoff_mp = playoff_row.get('MP', 0) * self.playoff_weight_multiplier
            
            combined['G'] = reg_g + playoff_g
            combined['GS'] = reg_gs + playoff_gs
            combined['MP'] = reg_mp + playoff_mp
            combined['Has_Playoff_Data'] = True
        else:
            combined['G'] = reg_g
            combined['GS'] = reg_gs
            combined['MP'] = reg_mp
            combined['Has_Playoff_Data'] = False
        
        # Advanced stats (weighted average by minutes)
        stat_cols = ['PER', 'TS%', 'BPM', 'VORP', 'WS/48', 'USG%', 'OBPM', 'DBPM']
        
        if playoff_row is not None and playoff_row.get('MP', 0) > 0:
            # Weight by minutes played (playoff minutes count 2x)
            reg_weight = reg_mp
            playoff_weight = playoff_row.get('MP', 0) * self.playoff_weight_multiplier
            total_weight = reg_weight + playoff_weight
            
            for stat in stat_cols:
                reg_val = reg_row.get(stat, 0)
                playoff_val = playoff_row.get(stat, 0)
                
                if pd.notna(reg_val) and pd.notna(playoff_val) and total_weight > 0:
                    combined[stat] = (reg_val * reg_weight + playoff_val * playoff_weight) / total_weight
                elif pd.notna(reg_val):
                    combined[stat] = reg_val
                else:
                    combined[stat] = 0
        else:
            # No playoff data, use regular season only
            for stat in stat_cols:
                combined[stat] = reg_row.get(stat, 0)
        
        return combined
    
    def load_ringer_rankings(self) -> pd.DataFrame:
        """Load Ringer Top 100 rankings"""
        file_path = self.data_dir / "ringer_top_100.csv"
        if file_path.exists():
            return pd.read_csv(file_path)
        return pd.DataFrame()
    
    def calculate_playing_time_factor(self, player_row: pd.Series) -> float:
        """
        Calculate playing time reliability factor (0.0 to 1.0)
        Note: Minutes and games are already weighted 2x for playoffs
        """
        minutes = player_row.get('MP', 0)
        games_started = player_row.get('GS', 0)
        total_games = player_row.get('G', 0)
        
        # Thresholds (already accounts for playoff weighting)
        min_minutes = 500
        min_starts = 20
        min_games = 30
        
        # Calculate factors
        minutes_factor = min(1.0, minutes / min_minutes)
        starts_factor = min(1.0, games_started / min_starts)
        games_factor = min(1.0, total_games / min_games)
        
        # Combined factor (weighted: 50% minutes, 30% starts, 20% games)
        playing_time_factor = (
            minutes_factor * 0.5 + 
            starts_factor * 0.3 + 
            games_factor * 0.2
        )
        
        # Apply minimum floor
        return max(0.3, playing_time_factor)
    
    def calculate_composite_score(self, player_row: pd.Series, 
                                  league_stats: pd.DataFrame) -> float:
        """
        Calculate composite score based on weighted advanced metrics
        """
        score = 0.0
        
        for metric, weight in self.metric_weights.items():
            if metric in player_row.index and pd.notna(player_row[metric]):
                # Get league average and std dev for normalization
                league_mean = league_stats[metric].mean()
                league_std = league_stats[metric].std()
                
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
        Calculate player's performance trajectory across all seasons
        """
        player_history = []
        
        for season in self.seasons:
            player_data = self.combined_data[
                (self.combined_data['Player'] == player_name) & 
                (self.combined_data['Season'] == season)
            ]
            
            if not player_data.empty:
                bpm = player_data['BPM'].iloc[0]
                if pd.notna(bpm):
                    player_history.append(bpm)
        
        if len(player_history) >= 2:
            # Calculate linear trend
            x = np.arange(len(player_history))
            coefficients = np.polyfit(x, player_history, 1)
            return coefficients[0]  # Slope
        
        return 0.0
    
    def simulate_head_to_head(self, player1: pd.Series, player2: pd.Series, 
                              n_simulations: int = 500) -> float:
        """
        Simulate head-to-head matchup between two players
        Returns: Win probability for player1 (0.0 to 1.0)
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
        p1_std = abs(p1_total) * 0.15
        p2_std = abs(p2_total) * 0.15
        
        # Run simulations
        p1_wins = 0
        for _ in range(n_simulations):
            p1_sim = np.random.normal(p1_total, p1_std)
            p2_sim = np.random.normal(p2_total, p2_std)
            
            if p1_sim > p2_sim:
                p1_wins += 1
        
        return p1_wins / n_simulations
    
    def generate_h2h_win_rates(self, players_df: pd.DataFrame, 
                               top_n: int = 150) -> Dict[str, float]:
        """
        Generate head-to-head win rates for all players
        """
        print(f"\nGenerating head-to-head matchups for {len(players_df)} players...")
        
        h2h_win_rates = {}
        
        for i, (idx1, player1) in enumerate(players_df.iterrows()):
            player1_name = player1['Player']
            total_win_prob = 0.0
            matchup_count = 0
            
            # Simulate against all other players
            for idx2, player2 in players_df.iterrows():
                if idx1 != idx2:
                    win_prob = self.simulate_head_to_head(player1, player2)
                    total_win_prob += win_prob
                    matchup_count += 1
            
            # Calculate average win rate
            if matchup_count > 0:
                h2h_win_rates[player1_name] = total_win_prob / matchup_count
            else:
                h2h_win_rates[player1_name] = 0.5
            
            if (i + 1) % 20 == 0:
                print(f"  Completed {i + 1}/{len(players_df)} players...")
        
        return h2h_win_rates
    
    def generate_rankings(self) -> pd.DataFrame:
        """
        Generate comprehensive player rankings across all seasons
        """
        print("\n" + "="*80)
        print("ENHANCED PLAYER RANKING SYSTEM V2.0")
        print("="*80)
        
        # Filter for minimum playing time
        print("\n1. Filtering players by minimum playing time...")
        valid_players = self.combined_data[
            (self.combined_data['G'] >= 10) & 
            (self.combined_data['MP'] >= 100)
        ].copy()
        
        print(f"   Found {len(valid_players)} player-seasons")
        
        # Calculate playing time factors
        print("\n2. Calculating playing time reliability factors...")
        valid_players['playing_time_factor'] = valid_players.apply(
            self.calculate_playing_time_factor, axis=1
        )
        
        # Calculate composite scores
        print("3. Calculating composite scores...")
        valid_players['composite_score'] = valid_players.apply(
            lambda row: self.calculate_composite_score(row, valid_players), axis=1
        )
        
        # Calculate historical trajectories
        print("4. Analyzing historical trajectories...")
        valid_players['trajectory'] = valid_players['Player'].apply(
            self.calculate_historical_trajectory
        )
        
        # Generate head-to-head win rates
        print("5. Running head-to-head simulations...")
        # Use top performers for H2H calculations
        top_players = valid_players.nlargest(200, 'composite_score')
        h2h_win_rates = self.generate_h2h_win_rates(top_players)
        
        # Map H2H win rates to all players
        valid_players['h2h_win_rate'] = valid_players['Player'].map(h2h_win_rates)
        valid_players['h2h_win_rate'] = valid_players['h2h_win_rate'].fillna(0.5)
        
        # Calculate final ranking score
        print("6. Computing final scores...")
        valid_players['final_score'] = (
            valid_players['composite_score'] * 0.50 +
            valid_players['h2h_win_rate'] * 100 * 0.40 +
            valid_players['trajectory'].fillna(0) * 0.10
        )
        
        # Add Ringer ranking if available
        if not self.ringer_rankings.empty:
            ringer_map = dict(zip(
                self.ringer_rankings['Player'],
                self.ringer_rankings['Rank']
            ))
            valid_players['ringer_rank'] = valid_players['Player'].map(ringer_map)
        
        # Sort by final score
        valid_players = valid_players.sort_values('final_score', ascending=False)
        valid_players['rank'] = range(1, len(valid_players) + 1)
        
        return valid_players
    
    def export_rankings(self, rankings_df: pd.DataFrame, output_dir: str = "data"):
        """
        Export rankings to various formats
        """
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Select key columns for export
        export_cols = [
            'rank', 'Player', 'Season', 'Team', 'Pos', 'Age', 
            'G', 'GS', 'MP', 'Has_Playoff_Data',
            'final_score', 'composite_score', 'h2h_win_rate', 
            'playing_time_factor', 'trajectory',
            'PER', 'BPM', 'VORP', 'WS/48', 'TS%', 'OBPM', 'DBPM',
            'ringer_rank'
        ]
        
        export_df = rankings_df[[col for col in export_cols if col in rankings_df.columns]]
        
        # Export to CSV
        csv_path = output_path / "player_rankings_multi_year_v2.csv"
        export_df.to_csv(csv_path, index=False)
        print(f"\n[OK] Rankings exported to: {csv_path}")
        
        # Export top 100 to JSON
        top_100 = export_df.head(100).to_dict('records')
        json_path = output_path / "player_rankings_top100_v2.json"
        with open(json_path, 'w') as f:
            json.dump({
                'generated_at': datetime.now().isoformat(),
                'version': '2.0',
                'methodology': 'Multi-year rankings with playoff weighting and direct H2H win rates',
                'rankings': top_100
            }, f, indent=2)
        print(f"[OK] Top 100 exported to: {json_path}")
        
        # Export summary
        summary = {
            'total_player_seasons': len(rankings_df),
            'unique_players': rankings_df['Player'].nunique(),
            'seasons_covered': self.seasons,
            'top_10': export_df.head(10)[['rank', 'Player', 'Season', 'Team', 'final_score', 'h2h_win_rate']].to_dict('records'),
            'methodology': {
                'composite_score_weight': 0.50,
                'h2h_win_rate_weight': 0.40,
                'trajectory_weight': 0.10,
                'playoff_minutes_multiplier': self.playoff_weight_multiplier,
            },
            'metric_weights': self.metric_weights
        }
        
        summary_path = output_path / "rankings_summary_v2.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"[OK] Summary exported to: {summary_path}")
        
        return export_df
    
    def print_rankings_report(self, rankings_df: pd.DataFrame, top_n: int = 50):
        """
        Print formatted rankings report
        """
        print("\n" + "="*100)
        print(f"TOP {top_n} PLAYER RANKINGS - MULTI-YEAR (2021-2026)")
        print("="*100)
        print(f"\n{'Rank':<6}{'Player':<25}{'Season':<8}{'Team':<6}{'Score':<8}{'H2H%':<8}{'BPM':<7}{'VORP':<7}{'Playoff':<8}")
        print("-" * 100)
        
        for idx, row in rankings_df.head(top_n).iterrows():
            rank = int(row['rank'])
            player = row['Player'][:24]
            season = row['Season']
            team = row['Team']
            score = f"{row['final_score']:.2f}"
            h2h = f"{row['h2h_win_rate']*100:.1f}%"
            bpm = f"{row['BPM']:.1f}" if pd.notna(row['BPM']) else "N/A"
            vorp = f"{row['VORP']:.1f}" if pd.notna(row['VORP']) else "N/A"
            playoff = "Yes" if row.get('Has_Playoff_Data', False) else "No"
            
            print(f"{rank:<6}{player:<25}{season:<8}{team:<6}{score:<8}{h2h:<8}{bpm:<7}{vorp:<7}{playoff:<8}")
        
        print("\n" + "="*100)
        print("METHODOLOGY SUMMARY V2.0")
        print("="*100)
        print("""
Key Improvements:
  • Multi-year tracking: Same player can appear multiple times across seasons
  • Playoff weighting: Playoff GP/GS/MP count 2x in playing time calculations
  • Direct H2H win rate: Removed Elo redundancy, using simulated win % directly
  • Enhanced transparency: H2H win % shown as primary ranking component

Final Score Calculation:
  • Composite Score (50%): Weighted combination of PER, BPM, VORP, WS/48, TS%, etc.
  • H2H Win Rate (40%): Average win probability vs all other players (direct simulation)
  • Historical Trajectory (10%): Performance trend across multiple seasons

Playoff Data Integration:
  • Playoff games, starts, and minutes weighted 2x vs regular season
  • Advanced stats weighted by minutes (playoff minutes count 2x)
  • Ensures playoff performance is properly valued

Head-to-Head Simulation:
  • 500 Monte Carlo simulations per matchup
  • Factors: Offensive impact, Defensive impact, Overall value
  • Win rate calculated as average win probability vs all opponents
  • No Elo conversion - direct win percentage used

Composite Score Weights:
  • BPM (20%), VORP (20%), PER (15%), WS/48 (15%), TS% (10%)
  • OBPM (7.5%), DBPM (7.5%), USG% (5%)
        """)


def main():
    """
    Main execution function
    """
    print("\n" + "="*80)
    print("ENHANCED PLAYER RANKING SYSTEM V2.0")
    print("Multi-Year Rankings with Playoff Weighting")
    print("="*80)
    
    # Initialize system
    ranking_system = EnhancedPlayerRankingSystem(data_dir="data")
    
    # Generate rankings
    rankings_df = ranking_system.generate_rankings()
    
    # Export results
    export_df = ranking_system.export_rankings(rankings_df)
    
    # Print report
    ranking_system.print_rankings_report(rankings_df, top_n=50)
    
    print("\n" + "="*80)
    print("RANKING GENERATION COMPLETE")
    print("="*80)
    print(f"\nTotal player-seasons ranked: {len(rankings_df)}")
    print(f"Unique players: {rankings_df['Player'].nunique()}")
    print(f"Seasons covered: {', '.join(ranking_system.seasons)}")
    print(f"\nFiles generated in: data/")
    print("  • player_rankings_multi_year_v2.csv")
    print("  • player_rankings_top100_v2.json")
    print("  • rankings_summary_v2.json")
    print("\n")


if __name__ == "__main__":
    main()
