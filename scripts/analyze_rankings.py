"""
Interactive Rankings Analysis Tool

This script provides various analyses and views of the player rankings:
- Top N by position
- Biggest risers/fallers vs Ringer rankings
- Statistical leaders
- Trajectory analysis
- Component breakdowns
"""

import pandas as pd
import json
from pathlib import Path

class RankingsAnalyzer:
    def __init__(self, rankings_file: str = "data/player_rankings_2025-26.csv"):
        self.df = pd.read_csv(rankings_file)
        
    def top_by_position(self, n: int = 10):
        """Show top N players by position"""
        print("\n" + "="*80)
        print(f"TOP {n} PLAYERS BY POSITION")
        print("="*80)
        
        positions = ['PG', 'SG', 'SF', 'PF', 'C']
        
        for pos in positions:
            print(f"\n{pos} - Point Guard" if pos == 'PG' else 
                  f"\n{pos} - Shooting Guard" if pos == 'SG' else
                  f"\n{pos} - Small Forward" if pos == 'SF' else
                  f"\n{pos} - Power Forward" if pos == 'PF' else
                  f"\n{pos} - Center")
            print("-" * 80)
            
            pos_df = self.df[self.df['Pos'] == pos].head(n)
            
            for idx, row in pos_df.iterrows():
                player = row['Player'].encode('ascii', 'replace').decode('ascii')
                rank = int(row['rank'])
                score = row['final_score']
                team = row['Team']
                print(f"  #{rank:<4} {player:<25} {team:<5} Score: {score:.2f}")
    
    def ringer_comparison(self, n: int = 20):
        """Compare our rankings with Ringer Top 100"""
        print("\n" + "="*80)
        print("BIGGEST DIFFERENCES VS RINGER TOP 100")
        print("="*80)
        
        # Filter players with Ringer rankings
        ringer_df = self.df[self.df['ringer_rank'].notna()].copy()
        ringer_df['rank_diff'] = ringer_df['ringer_rank'] - ringer_df['rank']
        
        print("\nBIGGEST RISERS (We rank higher):")
        print("-" * 80)
        risers = ringer_df.nlargest(n, 'rank_diff')
        
        for idx, row in risers.iterrows():
            player = row['Player'].encode('ascii', 'replace').decode('ascii')
            our_rank = int(row['rank'])
            ringer_rank = int(row['ringer_rank'])
            diff = int(row['rank_diff'])
            print(f"  {player:<25} Our: #{our_rank:<4} Ringer: #{ringer_rank:<4} (+{diff})")
        
        print("\nBIGGEST FALLERS (We rank lower):")
        print("-" * 80)
        fallers = ringer_df.nsmallest(n, 'rank_diff')
        
        for idx, row in fallers.iterrows():
            player = row['Player'].encode('ascii', 'replace').decode('ascii')
            our_rank = int(row['rank'])
            ringer_rank = int(row['ringer_rank'])
            diff = int(row['rank_diff'])
            print(f"  {player:<25} Our: #{our_rank:<4} Ringer: #{ringer_rank:<4} ({diff})")
    
    def statistical_leaders(self):
        """Show leaders in key statistical categories"""
        print("\n" + "="*80)
        print("STATISTICAL LEADERS")
        print("="*80)
        
        categories = [
            ('BPM', 'Box Plus/Minus'),
            ('VORP', 'Value Over Replacement'),
            ('PER', 'Player Efficiency Rating'),
            ('WS/48', 'Win Shares per 48'),
            ('TS%', 'True Shooting %'),
            ('elo_rating', 'Elo Rating'),
            ('h2h_win_rate', 'H2H Win Rate'),
        ]
        
        for stat, name in categories:
            print(f"\n{name} ({stat}):")
            print("-" * 80)
            
            leaders = self.df.nlargest(10, stat)
            
            for idx, row in leaders.iterrows():
                player = row['Player'][:24].encode('ascii', 'replace').decode('ascii')
                value = row[stat]
                rank = int(row['rank'])
                
                if stat == 'h2h_win_rate':
                    print(f"  #{rank:<4} {player:<25} {value*100:.1f}%")
                elif stat in ['TS%', 'WS/48']:
                    print(f"  #{rank:<4} {player:<25} {value:.3f}")
                elif stat == 'elo_rating':
                    print(f"  #{rank:<4} {player:<25} {value:.0f}")
                else:
                    print(f"  #{rank:<4} {player:<25} {value:.1f}")
    
    def trajectory_analysis(self, n: int = 15):
        """Analyze players with best/worst trajectories"""
        print("\n" + "="*80)
        print("TRAJECTORY ANALYSIS (Historical Performance Trends)")
        print("="*80)
        
        # Filter players with trajectory data
        traj_df = self.df[self.df['trajectory'].notna()].copy()
        
        print(f"\nFASTEST RISING PLAYERS (Top {n}):")
        print("-" * 80)
        print(f"{'Rank':<6}{'Player':<25}{'Team':<6}{'Trajectory':<12}{'Current BPM':<12}")
        print("-" * 80)
        
        rising = traj_df.nlargest(n, 'trajectory')
        
        for idx, row in rising.iterrows():
            player = row['Player'][:24].encode('ascii', 'replace').decode('ascii')
            rank = int(row['rank'])
            team = row['Team']
            traj = row['trajectory']
            bpm = row['BPM']
            print(f"{rank:<6}{player:<25}{team:<6}{traj:+.2f}/yr     {bpm:.1f}")
        
        print(f"\nFASTEST DECLINING PLAYERS (Bottom {n}):")
        print("-" * 80)
        print(f"{'Rank':<6}{'Player':<25}{'Team':<6}{'Trajectory':<12}{'Current BPM':<12}")
        print("-" * 80)
        
        declining = traj_df.nsmallest(n, 'trajectory')
        
        for idx, row in declining.iterrows():
            player = row['Player'][:24].encode('ascii', 'replace').decode('ascii')
            rank = int(row['rank'])
            team = row['Team']
            traj = row['trajectory']
            bpm = row['BPM']
            print(f"{rank:<6}{player:<25}{team:<6}{traj:+.2f}/yr     {bpm:.1f}")
    
    def component_breakdown(self, player_name: str):
        """Show detailed breakdown for a specific player"""
        player_df = self.df[self.df['Player'].str.contains(player_name, case=False)]
        
        if player_df.empty:
            print(f"\nPlayer '{player_name}' not found.")
            return
        
        player = player_df.iloc[0]
        
        print("\n" + "="*80)
        print(f"PLAYER BREAKDOWN: {player['Player']}")
        print("="*80)
        
        print(f"\nBasic Info:")
        print(f"  Rank: #{int(player['rank'])}")
        print(f"  Team: {player['Team']}")
        print(f"  Position: {player['Pos']}")
        print(f"  Age: {int(player['Age'])}")
        print(f"  Games: {int(player['G'])}")
        print(f"  Minutes: {int(player['MP'])}")
        
        print(f"\nFinal Score: {player['final_score']:.2f}")
        print(f"  Composite Score:    {player['composite_score']:.2f} (40% weight)")
        print(f"  Elo Rating:         {player['elo_rating']:.0f} (35% weight)")
        print(f"  H2H Win Rate:       {player['h2h_win_rate']*100:.1f}% (20% weight)")
        print(f"  Trajectory:         {player['trajectory']:+.2f} (5% weight)")
        
        print(f"\nAdvanced Stats:")
        print(f"  PER:    {player['PER']:.1f}")
        print(f"  BPM:    {player['BPM']:.1f}")
        print(f"  VORP:   {player['VORP']:.1f}")
        print(f"  WS/48:  {player['WS/48']:.3f}")
        print(f"  TS%:    {player['TS%']:.1%}")
        
        if pd.notna(player['ringer_rank']):
            print(f"\nRinger Ranking: #{int(player['ringer_rank'])}")
            diff = player['ringer_rank'] - player['rank']
            if diff > 0:
                print(f"  We rank {int(diff)} spots HIGHER")
            elif diff < 0:
                print(f"  We rank {int(abs(diff))} spots LOWER")
            else:
                print(f"  Rankings match!")
    
    def age_analysis(self):
        """Analyze rankings by age groups"""
        print("\n" + "="*80)
        print("AGE GROUP ANALYSIS")
        print("="*80)
        
        # Define age groups
        self.df['age_group'] = pd.cut(self.df['Age'], 
                                       bins=[0, 23, 27, 31, 100],
                                       labels=['Young (≤23)', 'Prime (24-27)', 
                                              'Veteran (28-31)', 'Elder (32+)'])
        
        for group in ['Young (≤23)', 'Prime (24-27)', 'Veteran (28-31)', 'Elder (32+)']:
            group_df = self.df[self.df['age_group'] == group]
            
            print(f"\n{group} - {len(group_df)} players")
            print("-" * 80)
            
            # Top 5 in this age group
            top_5 = group_df.head(5)
            
            for idx, row in top_5.iterrows():
                player = row['Player'][:24].encode('ascii', 'replace').decode('ascii')
                rank = int(row['rank'])
                age = int(row['Age'])
                score = row['final_score']
                print(f"  #{rank:<4} {player:<25} Age {age}  Score: {score:.2f}")
            
            # Group stats
            avg_score = group_df['final_score'].mean()
            avg_bpm = group_df['BPM'].mean()
            print(f"\n  Group Average Score: {avg_score:.2f}")
            print(f"  Group Average BPM: {avg_bpm:.2f}")
    
    def team_analysis(self, n: int = 10):
        """Show top teams by average player ranking"""
        print("\n" + "="*80)
        print(f"TOP {n} TEAMS BY AVERAGE PLAYER RANKING")
        print("="*80)
        
        # Calculate team averages
        team_stats = self.df.groupby('Team').agg({
            'final_score': 'mean',
            'rank': 'mean',
            'Player': 'count'
        }).rename(columns={'Player': 'num_players'})
        
        team_stats = team_stats.sort_values('final_score', ascending=False).head(n)
        
        print(f"\n{'Team':<6}{'Avg Score':<12}{'Avg Rank':<12}{'# Players':<12}")
        print("-" * 80)
        
        for team, row in team_stats.iterrows():
            print(f"{team:<6}{row['final_score']:.2f}       {row['rank']:.1f}        {int(row['num_players'])}")


def main():
    """Main menu for interactive analysis"""
    analyzer = RankingsAnalyzer()
    
    print("\n" + "="*80)
    print("PLAYER RANKINGS ANALYSIS TOOL")
    print("="*80)
    
    while True:
        print("\n\nSelect an analysis:")
        print("  1. Top players by position")
        print("  2. Compare with Ringer Top 100")
        print("  3. Statistical leaders")
        print("  4. Trajectory analysis (rising/falling players)")
        print("  5. Age group analysis")
        print("  6. Team analysis")
        print("  7. Player breakdown (search by name)")
        print("  8. Run all analyses")
        print("  0. Exit")
        
        choice = input("\nEnter choice (0-8): ").strip()
        
        if choice == '1':
            analyzer.top_by_position()
        elif choice == '2':
            analyzer.ringer_comparison()
        elif choice == '3':
            analyzer.statistical_leaders()
        elif choice == '4':
            analyzer.trajectory_analysis()
        elif choice == '5':
            analyzer.age_analysis()
        elif choice == '6':
            analyzer.team_analysis()
        elif choice == '7':
            name = input("Enter player name (partial match OK): ").strip()
            analyzer.component_breakdown(name)
        elif choice == '8':
            analyzer.top_by_position()
            analyzer.ringer_comparison()
            analyzer.statistical_leaders()
            analyzer.trajectory_analysis()
            analyzer.age_analysis()
            analyzer.team_analysis()
        elif choice == '0':
            print("\nExiting...")
            break
        else:
            print("\nInvalid choice. Please try again.")


if __name__ == "__main__":
    main()
