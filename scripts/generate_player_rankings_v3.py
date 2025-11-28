"""
Enhanced Player Ranking System V3.0
=====================================

Key Features:
1. ONE ROW PER PLAYER (current season only)
2. Historical data used as FEATURES (not separate rows)
3. New columns: Wins_Last_3_Years, Avg_BPM_Last_3_Years, etc.
4. Playoff performance weighted 2x for current season
5. Direct H2H win percentage (no Elo redundancy)

Methodology:
- Current Season Performance (60%): 2024-25 stats with playoff weighting
- Historical Performance (30%): Aggregate stats from past 3 seasons
- H2H Win Rate (10%): Direct head-to-head simulation results
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import json
from datetime import datetime

class PlayerRankingSystemV3:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.current_season = "24-25"  # Current season to rank
        self.historical_seasons = ["21-22", "22-23", "23-24"]  # Training data
        
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
        
        # Playoff multiplier
        self.playoff_weight_multiplier = 2.0
        
        # Load all data
        self.current_regular = self.load_season_data(self.current_season, 'regular')
        self.current_playoff = self.load_season_data(self.current_season, 'playoff')
        self.historical_data = self.load_historical_data()
        self.ringer_rankings = self.load_ringer_rankings()
        
    def load_season_data(self, season: str, season_type: str) -> pd.DataFrame:
        """Load regular or playoff data for a specific season"""
        if season_type == 'regular':
            file_path = self.data_dir / f"Bbref_Adv_{season}.csv"
        else:
            file_path = self.data_dir / f"Bbref_Playoff_Adv_{season}.csv"
        
        if file_path.exists():
            df = pd.read_csv(file_path)
            df = df[df['Player'] != 'League Average']
            
            # Convert percentage strings to floats
            pct_cols = ['TS%', '3PAr', 'FTr', 'ORB%', 'DRB%', 'TRB%', 
                       'AST%', 'STL%', 'BLK%', 'TOV%', 'USG%', 'WS/48']
            for col in pct_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            
            return df
        return pd.DataFrame()
    
    def load_historical_data(self) -> Dict[str, Dict[str, pd.DataFrame]]:
        """Load historical regular season and playoff data"""
        data = {}
        for season in self.historical_seasons:
            data[season] = {
                'regular': self.load_season_data(season, 'regular'),
                'playoff': self.load_season_data(season, 'playoff')
            }
        return data
    
    def load_ringer_rankings(self) -> pd.DataFrame:
        """Load Ringer Top 100 rankings"""
        file_path = self.data_dir / "ringer_top_100.csv"
        if file_path.exists():
            return pd.read_csv(file_path)
        return pd.DataFrame()
    
    def combine_current_season_stats(self, player_name: str) -> Dict:
        """
        Combine current season regular + playoff stats with 2x playoff weighting
        """
        # Get regular season data
        reg_data = self.current_regular[self.current_regular['Player'] == player_name]
        if reg_data.empty:
            return None
        
        reg_row = reg_data.iloc[0]
        
        # Get playoff data if available
        playoff_data = self.current_playoff[self.current_playoff['Player'] == player_name]
        playoff_row = playoff_data.iloc[0] if not playoff_data.empty else None
        
        combined = {}
        
        # Basic info
        combined['Player'] = player_name
        combined['Team'] = reg_row.get('Team', '')
        combined['Pos'] = reg_row.get('Pos', '')
        combined['Age'] = reg_row.get('Age', 0)
        
        # Playing time (playoff weighted 2x)
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
            combined['Playoff_Games'] = playoff_row.get('G', 0)
        else:
            combined['G'] = reg_g
            combined['GS'] = reg_gs
            combined['MP'] = reg_mp
            combined['Has_Playoff_Data'] = False
            combined['Playoff_Games'] = 0
        
        # Advanced stats (weighted by minutes)
        stat_cols = ['PER', 'TS%', 'BPM', 'VORP', 'WS/48', 'USG%', 'OBPM', 'DBPM']
        
        if playoff_row is not None and playoff_row.get('MP', 0) > 0:
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
            for stat in stat_cols:
                combined[stat] = reg_row.get(stat, 0)
        
        return combined
    
    def calculate_historical_features(self, player_name: str) -> Dict:
        """
        Calculate historical performance features from past 3 seasons
        """
        features = {
            'Seasons_Played': 0,
            'Total_Games_Last_3Y': 0,
            'Total_Playoff_Games_Last_3Y': 0,
            'Avg_BPM_Last_3Y': 0,
            'Avg_VORP_Last_3Y': 0,
            'Avg_PER_Last_3Y': 0,
            'Peak_BPM_Last_3Y': 0,
            'Trajectory_Last_3Y': 0,
            'Playoff_Experience_Score': 0,
        }
        
        bpm_values = []
        vorp_values = []
        per_values = []
        total_games = 0
        total_playoff_games = 0
        seasons_found = 0
        
        for season in self.historical_seasons:
            # Regular season data
            reg_df = self.historical_data[season]['regular']
            player_reg = reg_df[reg_df['Player'] == player_name]
            
            if not player_reg.empty:
                seasons_found += 1
                row = player_reg.iloc[0]
                
                # Collect stats
                bpm = row.get('BPM', 0)
                vorp = row.get('VORP', 0)
                per = row.get('PER', 0)
                games = row.get('G', 0)
                
                if pd.notna(bpm):
                    bpm_values.append(bpm)
                if pd.notna(vorp):
                    vorp_values.append(vorp)
                if pd.notna(per):
                    per_values.append(per)
                
                total_games += games
            
            # Playoff data
            playoff_df = self.historical_data[season]['playoff']
            player_playoff = playoff_df[playoff_df['Player'] == player_name]
            
            if not player_playoff.empty:
                playoff_games = player_playoff.iloc[0].get('G', 0)
                total_playoff_games += playoff_games
        
        # Calculate aggregates
        features['Seasons_Played'] = seasons_found
        features['Total_Games_Last_3Y'] = total_games
        features['Total_Playoff_Games_Last_3Y'] = total_playoff_games
        
        if bpm_values:
            features['Avg_BPM_Last_3Y'] = np.mean(bpm_values)
            features['Peak_BPM_Last_3Y'] = np.max(bpm_values)
            
            # Calculate trajectory (linear trend)
            if len(bpm_values) >= 2:
                x = np.arange(len(bpm_values))
                coefficients = np.polyfit(x, bpm_values, 1)
                features['Trajectory_Last_3Y'] = coefficients[0]
        
        if vorp_values:
            features['Avg_VORP_Last_3Y'] = np.mean(vorp_values)
        
        if per_values:
            features['Avg_PER_Last_3Y'] = np.mean(per_values)
        
        # Playoff experience score (weighted by recency)
        # More recent playoff games count more
        playoff_score = 0
        for i, season in enumerate(self.historical_seasons):
            weight = (i + 1) / len(self.historical_seasons)  # More recent = higher weight
            playoff_df = self.historical_data[season]['playoff']
            player_playoff = playoff_df[playoff_df['Player'] == player_name]
            
            if not player_playoff.empty:
                playoff_games = player_playoff.iloc[0].get('G', 0)
                playoff_score += playoff_games * weight
        
        features['Playoff_Experience_Score'] = playoff_score
        
        return features
    
    def calculate_playing_time_factor(self, player_stats: Dict) -> float:
        """Calculate playing time reliability factor"""
        minutes = player_stats.get('MP', 0)
        games_started = player_stats.get('GS', 0)
        total_games = player_stats.get('G', 0)
        
        min_minutes = 500
        min_starts = 20
        min_games = 30
        
        minutes_factor = min(1.0, minutes / min_minutes)
        starts_factor = min(1.0, games_started / min_starts)
        games_factor = min(1.0, total_games / min_games)
        
        playing_time_factor = (
            minutes_factor * 0.5 + 
            starts_factor * 0.3 + 
            games_factor * 0.2
        )
        
        return max(0.3, playing_time_factor)
    
    def calculate_composite_score(self, player_stats: Dict, 
                                  league_stats: pd.DataFrame) -> float:
        """Calculate composite score from current season stats"""
        score = 0.0
        
        for metric, weight in self.metric_weights.items():
            if metric in player_stats and pd.notna(player_stats[metric]):
                league_mean = league_stats[metric].mean()
                league_std = league_stats[metric].std()
                
                if league_std > 0:
                    z_score = (player_stats[metric] - league_mean) / league_std
                    score += z_score * weight
        
        playing_time_factor = self.calculate_playing_time_factor(player_stats)
        score *= playing_time_factor
        
        return score
    
    def calculate_historical_score(self, historical_features: Dict) -> float:
        """
        Calculate score from historical features
        """
        score = 0.0
        
        # Weight historical BPM (40%)
        if historical_features['Avg_BPM_Last_3Y'] != 0:
            score += historical_features['Avg_BPM_Last_3Y'] * 0.4
        
        # Weight trajectory (20%)
        score += historical_features['Trajectory_Last_3Y'] * 0.2
        
        # Weight playoff experience (20%)
        # Normalize playoff experience score
        max_playoff_score = 60  # ~20 games per year for 3 years
        normalized_playoff = min(1.0, historical_features['Playoff_Experience_Score'] / max_playoff_score)
        score += normalized_playoff * 5 * 0.2  # Scale to similar range as BPM
        
        # Weight consistency (20%) - more seasons = more reliable
        consistency = historical_features['Seasons_Played'] / 3.0
        score += consistency * 2 * 0.2
        
        return score
    
    def simulate_head_to_head(self, player1: Dict, player2: Dict, 
                              n_simulations: int = 500) -> float:
        """Simulate head-to-head matchup"""
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
        
        # Add variance
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
    
    def generate_rankings(self) -> pd.DataFrame:
        """Generate comprehensive player rankings"""
        print("\n" + "="*80)
        print("PLAYER RANKING SYSTEM V3.0 - ONE PLAYER PER ROW")
        print("="*80)
        
        # Get all current season players
        print("\n1. Loading current season players...")
        current_players = self.current_regular['Player'].unique()
        print(f"   Found {len(current_players)} players in {self.current_season}")
        
        # Build player data
        print("\n2. Combining current season stats (regular + playoff)...")
        player_data = []
        for player_name in current_players:
            player_stats = self.combine_current_season_stats(player_name)
            if player_stats and player_stats['G'] >= 10:  # Minimum games filter
                player_data.append(player_stats)
        
        print(f"   {len(player_data)} players meet minimum games threshold")
        
        # Convert to DataFrame
        players_df = pd.DataFrame(player_data)
        
        # Calculate composite scores
        print("\n3. Calculating current season composite scores...")
        players_df['composite_score'] = players_df.apply(
            lambda row: self.calculate_composite_score(row.to_dict(), players_df), 
            axis=1
        )
        
        # Add historical features
        print("\n4. Calculating historical features (last 3 years)...")
        historical_features_list = []
        for player_name in players_df['Player']:
            features = self.calculate_historical_features(player_name)
            historical_features_list.append(features)
        
        # Add historical features to DataFrame
        hist_df = pd.DataFrame(historical_features_list)
        players_df = pd.concat([players_df, hist_df], axis=1)
        
        # Calculate historical score
        print("\n5. Calculating historical performance scores...")
        players_df['historical_score'] = players_df.apply(
            lambda row: self.calculate_historical_score(row.to_dict()), 
            axis=1
        )
        
        # Generate H2H win rates
        print("\n6. Running head-to-head simulations...")
        top_players = players_df.nlargest(150, 'composite_score')
        
        h2h_win_rates = {}
        for i, (idx1, player1) in enumerate(top_players.iterrows()):
            total_win_prob = 0.0
            matchup_count = 0
            
            for idx2, player2 in top_players.iterrows():
                if idx1 != idx2:
                    win_prob = self.simulate_head_to_head(
                        player1.to_dict(), 
                        player2.to_dict()
                    )
                    total_win_prob += win_prob
                    matchup_count += 1
            
            if matchup_count > 0:
                h2h_win_rates[player1['Player']] = total_win_prob / matchup_count
            
            if (i + 1) % 20 == 0:
                print(f"   Completed {i + 1}/{len(top_players)} players...")
        
        players_df['h2h_win_rate'] = players_df['Player'].map(h2h_win_rates)
        players_df['h2h_win_rate'] = players_df['h2h_win_rate'].fillna(0.5)
        
        # Calculate final score
        print("\n7. Computing final scores...")
        players_df['final_score'] = (
            players_df['composite_score'] * 0.60 +
            players_df['historical_score'] * 0.30 +
            players_df['h2h_win_rate'] * 100 * 0.10
        )
        
        # Add Ringer ranking
        if not self.ringer_rankings.empty:
            ringer_map = dict(zip(
                self.ringer_rankings['Player'],
                self.ringer_rankings['Rank']
            ))
            players_df['ringer_rank'] = players_df['Player'].map(ringer_map)
        
        # Sort and rank
        players_df = players_df.sort_values('final_score', ascending=False)
        players_df['rank'] = range(1, len(players_df) + 1)
        
        return players_df
    
    def export_rankings(self, rankings_df: pd.DataFrame, output_dir: str = "data"):
        """Export rankings to files"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Select columns for export
        export_cols = [
            'rank', 'Player', 'Team', 'Pos', 'Age', 
            'G', 'GS', 'MP', 'Has_Playoff_Data', 'Playoff_Games',
            'final_score', 'composite_score', 'historical_score', 'h2h_win_rate',
            'PER', 'BPM', 'VORP', 'WS/48', 'TS%', 'OBPM', 'DBPM',
            'Seasons_Played', 'Total_Games_Last_3Y', 'Total_Playoff_Games_Last_3Y',
            'Avg_BPM_Last_3Y', 'Avg_VORP_Last_3Y', 'Peak_BPM_Last_3Y',
            'Trajectory_Last_3Y', 'Playoff_Experience_Score',
            'ringer_rank'
        ]
        
        export_df = rankings_df[[col for col in export_cols if col in rankings_df.columns]]
        
        # Export to CSV
        csv_path = output_path / f"player_rankings_{self.current_season}_v3.csv"
        export_df.to_csv(csv_path, index=False)
        print(f"\n[OK] Rankings exported to: {csv_path}")
        
        # Export top 100 to JSON
        top_100 = export_df.head(100).to_dict('records')
        json_path = output_path / f"player_rankings_top100_{self.current_season}_v3.json"
        with open(json_path, 'w') as f:
            json.dump({
                'generated_at': datetime.now().isoformat(),
                'season': self.current_season,
                'version': '3.0',
                'methodology': 'One player per row with historical features',
                'rankings': top_100
            }, f, indent=2)
        print(f"[OK] Top 100 exported to: {json_path}")
        
        # Export summary
        summary = {
            'total_players': len(rankings_df),
            'season': self.current_season,
            'historical_seasons': self.historical_seasons,
            'top_10': export_df.head(10)[['rank', 'Player', 'Team', 'final_score', 'h2h_win_rate', 'Total_Playoff_Games_Last_3Y']].to_dict('records'),
            'methodology': {
                'current_season_weight': 0.60,
                'historical_weight': 0.30,
                'h2h_win_rate_weight': 0.10,
                'playoff_minutes_multiplier': self.playoff_weight_multiplier,
            }
        }
        
        summary_path = output_path / f"rankings_summary_{self.current_season}_v3.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"[OK] Summary exported to: {summary_path}")
        
        return export_df
    
    def print_rankings_report(self, rankings_df: pd.DataFrame, top_n: int = 50):
        """Print formatted rankings report"""
        print("\n" + "="*120)
        print(f"TOP {top_n} PLAYER RANKINGS - {self.current_season} SEASON")
        print("="*120)
        print(f"\n{'Rank':<6}{'Player':<25}{'Team':<6}{'Score':<8}{'H2H%':<8}{'BPM':<7}{'VORP':<7}{'PO_3Y':<8}{'Traj':<7}")
        print("-" * 120)
        
        for idx, row in rankings_df.head(top_n).iterrows():
            rank = int(row['rank'])
            player = row['Player'][:24]
            team = row['Team']
            score = f"{row['final_score']:.2f}"
            h2h = f"{row['h2h_win_rate']*100:.1f}%"
            bpm = f"{row['BPM']:.1f}" if pd.notna(row['BPM']) else "N/A"
            vorp = f"{row['VORP']:.1f}" if pd.notna(row['VORP']) else "N/A"
            po_3y = int(row['Total_Playoff_Games_Last_3Y'])
            traj = f"{row['Trajectory_Last_3Y']:+.2f}"
            
            print(f"{rank:<6}{player:<25}{team:<6}{score:<8}{h2h:<8}{bpm:<7}{vorp:<7}{po_3y:<8}{traj:<7}")
        
        print("\n" + "="*120)
        print("METHODOLOGY SUMMARY V3.0")
        print("="*120)
        print(f"""
Final Score Calculation:
  • Current Season Performance (60%): {self.current_season} stats with playoff weighting
  • Historical Performance (30%): Aggregate from last 3 years ({', '.join(self.historical_seasons)})
  • H2H Win Rate (10%): Direct head-to-head simulation results

Current Season Component:
  • Composite Score: Weighted combination of PER, BPM, VORP, WS/48, TS%, etc.
  • Playoff games/starts/minutes weighted 2x
  • Advanced stats weighted by minutes (playoff minutes count 2x)

Historical Component:
  • Avg BPM Last 3 Years (40%)
  • Trajectory (20%) - improving vs declining
  • Playoff Experience Score (20%) - weighted by recency
  • Consistency (20%) - number of seasons played

New Columns:
  • Total_Playoff_Games_Last_3Y: Playoff experience over past 3 seasons
  • Avg_BPM_Last_3Y: Average BPM from past 3 seasons
  • Trajectory_Last_3Y: Performance trend (positive = improving)
  • Playoff_Experience_Score: Weighted playoff games (recent = higher weight)

Note: ONE ROW PER PLAYER - Historical data used as features, not separate rows
        """)


def main():
    """Main execution function"""
    print("\n" + "="*80)
    print("PLAYER RANKING SYSTEM V3.0")
    print("One Player Per Row - Historical Data as Features")
    print("="*80)
    
    # Initialize system
    ranking_system = PlayerRankingSystemV3(data_dir="data")
    
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
    print(f"Season: {ranking_system.current_season}")
    print(f"Historical data from: {', '.join(ranking_system.historical_seasons)}")
    print(f"\nFiles generated in: data/")
    print(f"  • player_rankings_{ranking_system.current_season}_v3.csv")
    print(f"  • player_rankings_top100_{ranking_system.current_season}_v3.json")
    print(f"  • rankings_summary_{ranking_system.current_season}_v3.json")
    print("\n")


if __name__ == "__main__":
    main()
