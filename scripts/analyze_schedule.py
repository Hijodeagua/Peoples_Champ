"""
Schedule Analysis Tool

Analyze the generated 50-day player schedule with various queries and visualizations.
"""

import pandas as pd
import json
from collections import defaultdict, Counter
from itertools import combinations


def safe_print(text):
    """Print text with unicode handling."""
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('ascii', 'replace').decode('ascii'))


def load_schedule():
    """Load schedule data."""
    schedule = pd.read_csv('data/daily_schedule.csv')
    freq = pd.read_csv('data/player_frequency.csv')
    
    with open('data/daily_schedule.json', 'r') as f:
        schedule_json = json.load(f)
    
    return schedule, freq, schedule_json


def print_section(title):
    """Print section header."""
    print("\n" + "="*70)
    print(title)
    print("="*70 + "\n")


def analyze_frequency(freq):
    """Analyze player frequency distribution."""
    print_section("PLAYER FREQUENCY ANALYSIS")
    
    # By tier
    for tier in ['top_10', 'tier_2', 'tier_3']:
        tier_data = freq[freq['tier'] == tier]
        print(f"{tier.upper().replace('_', ' ')}:")
        print(f"  Players: {len(tier_data)}")
        print(f"  Total appearances: {tier_data['appearances'].sum()}")
        print(f"  Range: {tier_data['appearances'].min()}-{tier_data['appearances'].max()}")
        print(f"  Average: {tier_data['appearances'].mean():.2f}")
        print()
    
    # Top 10 most frequent
    print("Top 10 Most Frequent Players:")
    top_freq = freq.nlargest(10, 'appearances')
    for _, row in top_freq.iterrows():
        safe_print(f"  #{row['rank']:2d} {row['player']:25s} - {row['appearances']} times")
    print()


def analyze_daily_distribution(schedule):
    """Analyze distribution of players across days."""
    print_section("DAILY DISTRIBUTION ANALYSIS")
    
    # Top 10 players per day
    top_10_per_day = schedule[schedule['rank'] <= 10].groupby('day').size()
    
    print("Top 10 Players per Day:")
    print(f"  Average: {top_10_per_day.mean():.2f}")
    print(f"  Range: {top_10_per_day.min()}-{top_10_per_day.max()}")
    print()
    
    # Days with most top 10
    print("Days with Most Top 10 Players:")
    top_days = top_10_per_day.nlargest(5)
    for day, count in top_days.items():
        day_data = schedule[schedule['day'] == day]
        players = day_data['player'].tolist()
        print(f"  Day {day}: {count} top-10 players")
        for _, row in day_data[day_data['rank'] <= 10].iterrows():
            safe_print(f"    #{row['rank']} {row['player']}")
    print()


def analyze_team_distribution(schedule):
    """Analyze team representation."""
    print_section("TEAM DISTRIBUTION ANALYSIS")
    
    team_counts = schedule.groupby('team').size().sort_values(ascending=False)
    
    print("Most Represented Teams:")
    for team, count in team_counts.head(10).items():
        players = schedule[schedule['team'] == team]['player'].unique()
        print(f"  {team}: {count} appearances ({len(players)} unique players)")
    print()


def analyze_player_pairs(schedule):
    """Analyze which players appear together most often."""
    print_section("PLAYER PAIR ANALYSIS")
    
    # Group by day
    days = schedule.groupby('day')
    
    # Count pairs
    pair_counts = defaultdict(int)
    for day_num, day_data in days:
        players = [(row['rank'], row['player']) for _, row in day_data.iterrows()]
        for pair in combinations(players, 2):
            # Sort by rank to make pairs consistent
            pair_sorted = tuple(sorted(pair, key=lambda x: x[0]))
            pair_counts[pair_sorted] += 1
    
    # Most common pairs
    sorted_pairs = sorted(pair_counts.items(), key=lambda x: x[1], reverse=True)
    
    print("Most Common Player Pairs:")
    for pair, count in sorted_pairs[:15]:
        safe_print(f"  #{pair[0][0]:2d} {pair[0][1]:25s} & #{pair[1][0]:2d} {pair[1][1]:25s}: {count} times")
    print()


def analyze_player_trios(schedule):
    """Analyze which trios appear together."""
    print_section("PLAYER TRIO ANALYSIS")
    
    # Group by day
    days = schedule.groupby('day')
    
    # Count trios
    trio_counts = defaultdict(int)
    for day_num, day_data in days:
        players = [(row['rank'], row['player']) for _, row in day_data.iterrows()]
        for trio in combinations(players, 3):
            # Sort by rank
            trio_sorted = tuple(sorted(trio, key=lambda x: x[0]))
            trio_counts[trio_sorted] += 1
    
    # Trios appearing more than once
    repeated_trios = {k: v for k, v in trio_counts.items() if v > 1}
    
    print(f"Total Unique Trios: {len(trio_counts)}")
    print(f"Trios Appearing Once: {sum(1 for v in trio_counts.values() if v == 1)}")
    print(f"Trios Appearing 2+ Times: {len(repeated_trios)}")
    print()
    
    if repeated_trios:
        print("Trios Appearing Multiple Times:")
        sorted_trios = sorted(repeated_trios.items(), key=lambda x: x[1], reverse=True)
        for trio, count in sorted_trios[:10]:
            print(f"  {count} times:")
            for rank, player in trio:
                safe_print(f"    #{rank:2d} {player}")
            print()


def analyze_player_schedule(schedule, player_name):
    """Analyze schedule for a specific player."""
    print_section(f"SCHEDULE FOR: {player_name}")
    
    player_data = schedule[schedule['player'] == player_name]
    
    if len(player_data) == 0:
        print(f"Player '{player_name}' not found in schedule.")
        return
    
    print(f"Total Appearances: {len(player_data)}")
    print(f"Rank: #{player_data.iloc[0]['rank']}")
    print(f"Team: {player_data.iloc[0]['team']}")
    print()
    
    print("Schedule:")
    for _, row in player_data.iterrows():
        print(f"  Day {row['day']:2d} ({row['date']}) - Slot {row['player_slot']}")
    print()
    
    # Who they appear with most
    days_list = player_data['day'].tolist()
    teammates = schedule[schedule['day'].isin(days_list) & (schedule['player'] != player_name)]
    teammate_counts = teammates['player'].value_counts()
    
    print("Most Common Teammates:")
    for teammate, count in teammate_counts.head(10).items():
        teammate_rank = teammates[teammates['player'] == teammate].iloc[0]['rank']
        safe_print(f"  #{teammate_rank:2d} {teammate:25s}: {count} times")
    print()


def find_interesting_days(schedule):
    """Find days with interesting player combinations."""
    print_section("INTERESTING DAYS")
    
    days = schedule.groupby('day')
    
    interesting = []
    
    for day_num, day_data in days:
        ranks = day_data['rank'].tolist()
        players = day_data['player'].tolist()
        
        # All top 10
        if all(r <= 10 for r in ranks):
            interesting.append((day_num, "All Top 10", day_data))
        
        # Wide rank spread
        rank_spread = max(ranks) - min(ranks)
        if rank_spread > 60:
            interesting.append((day_num, f"Wide Spread ({rank_spread})", day_data))
        
        # Multiple players from same team
        teams = day_data['team'].value_counts()
        if teams.max() >= 3:
            team = teams.idxmax()
            interesting.append((day_num, f"3+ from {team}", day_data))
    
    for day_num, reason, day_data in interesting[:10]:
        print(f"Day {day_num} - {reason}:")
        for _, row in day_data.iterrows():
            safe_print(f"  #{row['rank']:2d} {row['player']:25s} ({row['team']})")
        print()


def export_summary_stats(schedule, freq):
    """Export summary statistics."""
    print_section("EXPORTING SUMMARY STATS")
    
    stats = {
        'total_days': int(schedule['day'].max()),
        'total_slots': int(len(schedule)),
        'unique_players': int(len(freq)),
        'avg_appearances': float(freq['appearances'].mean()),
        'top_10_total': int(freq[freq['tier'] == 'top_10']['appearances'].sum()),
        'tier_2_total': int(freq[freq['tier'] == 'tier_2']['appearances'].sum()),
        'tier_3_total': int(freq[freq['tier'] == 'tier_3']['appearances'].sum()),
    }
    
    # Team stats
    team_stats = schedule.groupby('team').agg({
        'player': 'nunique',
        'day': 'count'
    }).rename(columns={'player': 'unique_players', 'day': 'total_appearances'})
    
    # Save
    with open('data/schedule_stats.json', 'w') as f:
        json.dump(stats, f, indent=2)
    
    team_stats.to_csv('data/team_stats.csv')
    
    print("Saved: data/schedule_stats.json")
    print("Saved: data/team_stats.csv")
    print()
    
    # Print summary
    print("Summary Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value:.2f}" if isinstance(value, float) else f"  {key}: {value}")
    print()


def main():
    """Main analysis function."""
    print("="*70)
    print("DAILY SCHEDULE ANALYSIS")
    print("="*70)
    
    # Load data
    print("\nLoading schedule data...")
    schedule, freq, schedule_json = load_schedule()
    print(f"Loaded {len(schedule)} schedule entries for {len(freq)} players\n")
    
    # Run analyses
    analyze_frequency(freq)
    analyze_daily_distribution(schedule)
    analyze_team_distribution(schedule)
    analyze_player_pairs(schedule)
    analyze_player_trios(schedule)
    find_interesting_days(schedule)
    
    # Example player analysis
    # Uncomment and change player name to analyze specific player
    # analyze_player_schedule(schedule, "Nikola Jokić")
    
    # Export stats
    export_summary_stats(schedule, freq)
    
    print("="*70)
    print("ANALYSIS COMPLETE")
    print("="*70)
    print("\nTo analyze a specific player, edit the script and uncomment:")
    print("  analyze_player_schedule(schedule, 'Player Name')")
    print()


if __name__ == '__main__':
    main()
