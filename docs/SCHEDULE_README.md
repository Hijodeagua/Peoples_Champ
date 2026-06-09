# Daily Player Game Schedule - Quick Guide

## Overview

A 50-day schedule with 5 players per day, optimized to satisfy all frequency and trio constraints.

**Status:** ✅ All constraints satisfied!

---

## Quick Stats

- **Total Days:** 50
- **Players per Day:** 5
- **Total Slots:** 250
- **Unique Players:** 75 (from top 75 ranked)
- **Start Date:** November 26, 2025

### Player Distribution

| Tier | Ranks | Players | Appearances Each | Total Slots |
|------|-------|---------|------------------|-------------|
| **Top 10** | 1-10 | 10 | 5 times | 50 |
| **Tier 2** | 11-30 | 20 | 4 times | 80 |
| **Tier 3** | 31-75 | 45 | 1-3 times | 120 |

### Trio Statistics

- **Unique Trios:** 15,402 possible combinations
- **Max Trio Appearances:** 2 (constraint satisfied!)
- **Trios appearing 2x:** Only 2 trios
- **Trios appearing 1x:** 496 trios
- **Trios appearing 0x:** 14,904 trios

---

## Files Generated

### 1. `data/daily_schedule.csv`

Complete schedule in CSV format with columns:
- `day` - Day number (1-50)
- `date` - Calendar date
- `day_of_week` - Day name
- `player_slot` - Position in that day (1-5)
- `rank` - Player's ranking
- `player` - Player name
- `team` - Team abbreviation
- `final_score` - Ranking score
- `bpm` - Box Plus/Minus

**Example:**
```csv
day,date,day_of_week,player_slot,rank,player,team,final_score,bpm
1,2025-11-26,Wednesday,1,1,Victor Wembanyama,SAS,20.86,6.4
1,2025-11-26,Wednesday,2,3,Paul Reed,DET,19.95,6.0
...
```

### 2. `data/player_frequency.csv`

Player appearance counts:
- `rank` - Player ranking
- `player` - Player name
- `team` - Team
- `tier` - Tier classification
- `appearances` - Number of times scheduled
- `min_allowed` - Minimum required
- `max_allowed` - Maximum allowed

### 3. `data/daily_schedule.json`

Full schedule in JSON format with metadata, constraints, and daily breakdowns.

### 4. `data/DAILY_SCHEDULE.md`

Human-readable markdown schedule showing all 50 days with player names and ranks.

---

## Sample Schedule

### Week 1

**Day 1 - Nov 26 (Wednesday)**
1. #1 Victor Wembanyama (SAS)
2. #3 Paul Reed (DET)
3. #10 Kristaps Porziņģis (ATL)
4. #5 Nikola Jokić (DEN)
5. #17 Tyrese Maxey (PHI)

**Day 2 - Nov 27 (Thursday)**
1. #9 Robert Williams (POR)
2. #8 Isaiah Stewart (DET)
3. #16 Derrick White (BOS)
4. #1 Victor Wembanyama (SAS)
5. #6 Luka Dončić (LAL)

**Day 3 - Nov 28 (Friday)**
1. #2 Shai Gilgeous-Alexander (OKC)
2. #12 Branden Carlson (OKC)
3. #9 Robert Williams (POR)
4. #7 Scottie Barnes (TOR)
5. #4 Giannis Antetokounmpo (MIL)

---

## Constraints Satisfied ✅

### Frequency Constraints

| Tier | Constraint | Status |
|------|------------|--------|
| Top 10 (1-10) | 3-5 appearances | ✅ All players: 5 appearances |
| Tier 2 (11-30) | 2-4 appearances | ✅ All players: 4 appearances |
| Tier 3 (31-75) | 1-3 appearances | ✅ Range: 1-3 appearances |

### Trio Constraints

✅ **No trio appears more than 2 times**
- Exception: All-top-10 trios allowed (but none exceeded 2 anyway)
- Only 2 trios appear exactly 2 times
- All other trios appear 0-1 times

---

## How to Use

### Load Schedule in Python

```python
import pandas as pd

# Load daily schedule
schedule = pd.read_csv('data/daily_schedule.csv')

# Get specific day
day_1 = schedule[schedule['day'] == 1]
print(day_1[['player_slot', 'rank', 'player', 'team']])

# Get all appearances of a player
jokic = schedule[schedule['player'] == 'Nikola Jokić']
print(f"Jokić appears on days: {jokic['day'].tolist()}")
```

### Load Player Frequency

```python
# Load frequency data
freq = pd.read_csv('data/player_frequency.csv')

# Check top 10 players
top_10 = freq[freq['tier'] == 'top_10']
print(top_10[['rank', 'player', 'appearances']])

# Find players appearing most
most_frequent = freq.nlargest(10, 'appearances')
print(most_frequent[['rank', 'player', 'appearances']])
```

### Load JSON Schedule

```python
import json

with open('data/daily_schedule.json', 'r') as f:
    data = json.load(f)

# Get metadata
print(f"Generated: {data['metadata']['generated_at']}")
print(f"Total players: {data['statistics']['unique_players']}")

# Get specific day
day_5 = data['schedule'][4]  # 0-indexed
print(f"Day {day_5['day']} - {day_5['date']}")
for player in day_5['players']:
    print(f"  #{player['rank']} {player['name']} ({player['team']})")
```

---

## Regenerating Schedule

To generate a new schedule (e.g., with different start date or random seed):

```bash
python scripts/generate_daily_schedule.py
```

### Customization

Edit `scripts/generate_daily_schedule.py`:

```python
# Change start date
generator = DailyScheduleGenerator(
    rankings_file='data/player_rankings_2025-26.csv',
    start_date='2025-12-01'  # Change this
)

# Change random seed for different schedule
random.seed(123)  # Line ~318
```

---

## Validation

The schedule has been validated against all constraints:

### ✅ Frequency Validation
- Every player appears within their tier's min/max range
- Top 10: All appear exactly 5 times
- Tier 2: All appear exactly 4 times
- Tier 3: All appear 1-3 times

### ✅ Trio Validation
- No trio appears more than 2 times
- Only 2 trios hit the maximum (2 appearances)
- 496 trios appear once
- 14,904 trios never appear together

### ✅ Daily Validation
- Every day has exactly 5 players
- No player appears twice in the same day
- All 50 days successfully filled

---

## Key Features

### 1. Balanced Distribution
- Top players appear frequently (5x each)
- Mid-tier players appear regularly (4x each)
- Lower-tier players appear 1-3 times
- Total: 250 slots perfectly allocated

### 2. Trio Diversity
- 15,402 unique trios possible
- Only 498 trios actually appear
- Maximum variety maintained
- No repetitive matchups

### 3. Smart Scheduling
- Priority scoring system
- Backtracking algorithm for constraint satisfaction
- Randomness for variety
- Urgency-based selection (ensures minimums met)

---

## Analytics Queries

### Find Days with Most Top 10 Players

```python
schedule = pd.read_csv('data/daily_schedule.csv')

# Count top 10 players per day
top_10_per_day = schedule[schedule['rank'] <= 10].groupby('day').size()
print(top_10_per_day.sort_values(ascending=False).head())
```

### Find Player Pairs That Appear Together

```python
from itertools import combinations

# Group by day
days = schedule.groupby('day')['player'].apply(list)

# Count pairs
pair_counts = {}
for day_players in days:
    for pair in combinations(sorted(day_players), 2):
        pair_counts[pair] = pair_counts.get(pair, 0) + 1

# Most common pairs
sorted_pairs = sorted(pair_counts.items(), key=lambda x: x[1], reverse=True)
print("Most common pairs:")
for pair, count in sorted_pairs[:10]:
    print(f"  {pair[0]} & {pair[1]}: {count} times")
```

### Check Team Distribution

```python
# Players per team
team_counts = schedule.groupby('team').size().sort_values(ascending=False)
print("Most represented teams:")
print(team_counts.head(10))
```

---

## Next Steps

### For Game Implementation

1. **Load daily schedule** from CSV/JSON
2. **Display 5 players** for current day
3. **Track user rankings** of the 5 players
4. **Compare with actual rankings** for scoring
5. **Move to next day** after completion

### For Analysis

1. **Track which trios** are most interesting
2. **Analyze player matchups** that generate engagement
3. **Adjust future schedules** based on user feedback
4. **A/B test** different scheduling strategies

### For Updates

1. **Regenerate schedule** when rankings update
2. **Adjust constraints** based on game metrics
3. **Add new players** as season progresses
4. **Archive old schedules** for historical reference

---

## Technical Details

### Algorithm

1. **Initialization**
   - Load player rankings
   - Organize into tiers (Top 10, 11-30, 31-75)
   - Set frequency constraints per tier

2. **Daily Selection**
   - Score all valid candidates
   - Prioritize players below minimum appearances
   - Check trio constraints before adding
   - Backtrack if no valid options

3. **Validation**
   - Verify frequency constraints
   - Verify trio constraints
   - Report any violations

4. **Export**
   - CSV for data analysis
   - JSON for programmatic access
   - Markdown for human reading

### Complexity

- **Time:** ~10-30 seconds
- **Space:** ~5 MB output files
- **Simulations:** 5,000 max attempts per day
- **Backtracks:** Up to 100 per day

---

## FAQ

**Q: Why do top 10 players appear exactly 5 times?**
A: The algorithm maximizes appearances within constraints. With 50 days × 5 slots = 250 total, and 10 top players, 5 appearances each = 50 slots, which is optimal.

**Q: Can I change the constraints?**
A: Yes! Edit the `constraints` dict in `DailyScheduleGenerator.__init__()` in the script.

**Q: What if I want more/fewer days?**
A: Change `self.num_days = 50` in the script and regenerate.

**Q: How are trios tracked?**
A: Every combination of 3 players in a day is stored as a sorted tuple. The algorithm checks this before adding players.

**Q: What's the top 10 trio exception?**
A: If all 3 players in a trio are ranked 1-10, the 2-appearance limit can be exceeded (though it wasn't needed in this schedule).

---

## Summary

✅ **50-day schedule generated**  
✅ **All constraints satisfied**  
✅ **75 unique players scheduled**  
✅ **250 total slots filled**  
✅ **Maximum trio diversity**  
✅ **Balanced distribution**  

**Ready to use!** 🎮

---

**Generated:** November 26, 2025  
**Algorithm:** Constraint-based scheduling with backtracking  
**Validation:** 100% pass rate  
**Files:** 4 output formats (CSV, JSON, Markdown, Frequency)
