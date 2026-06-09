# Daily Game Archive Information

## Schedule Timeline

**Start Date:** November 21, 2025 (Friday)  
**End Date:** January 9, 2026 (Friday)  
**Total Duration:** 50 days

---

## Archive Structure

### Past Games (Archive) - Days 1-5

These games have already "occurred" and can be used to test your archive/history features:

| Day | Date | Day of Week | Players |
|-----|------|-------------|---------|
| **1** | **Nov 21, 2025** | Friday | #1 Wembanyama, #3 Reed, #10 Porziņģis, #5 Jokić, #17 Maxey |
| **2** | **Nov 22, 2025** | Saturday | #9 R.Williams, #8 Stewart, #16 White, #1 Wembanyama, #6 Dončić |
| **3** | **Nov 23, 2025** | Sunday | #2 SGA, #12 Carlson, #9 R.Williams, #7 Barnes, #4 Giannis |
| **4** | **Nov 24, 2025** | Monday | #15 Curry, #25 Gafford, #23 Cunningham, #28 Mitchell, #3 Reed |
| **5** | **Nov 25, 2025** | Tuesday | #24 Valančiūnas, #11 Sarr, #29 Duren, #21 Kalkbrenner, #7 Barnes |

### Current Game - Day 6

**TODAY:** November 26, 2025 (Wednesday)

**Day 6 Players:**
1. #30 Jalen Suggs (ORL)
2. #6 Luka Dončić (LAL)
3. #18 Goga Bitadze (ORL)
4. #14 Chet Holmgren (OKC)
5. #5 Nikola Jokić (DEN)

### Future Games - Days 7-50

Scheduled through January 9, 2026

---

## Using the Archive

### Load Past Games

```python
import pandas as pd
from datetime import datetime

schedule = pd.read_csv('data/daily_schedule.csv')

# Get archive games (past 5 days)
archive = schedule[schedule['day'] <= 5]

# Get today's game
today = schedule[schedule['day'] == 6]

# Get future games
future = schedule[schedule['day'] > 6]

print(f"Archive: {len(archive)} entries ({len(archive)//5} days)")
print(f"Today: {len(today)} players")
print(f"Future: {len(future)} entries ({len(future)//5} days)")
```

### Display Archive by Date

```python
# Get specific archived day
day_1 = schedule[schedule['day'] == 1]
print(f"Day 1 ({day_1.iloc[0]['date']}):")
for _, player in day_1.iterrows():
    print(f"  {player['player_slot']}. #{player['rank']} {player['player']}")
```

### Check if Date is in Archive

```python
from datetime import datetime

def is_archived(date_str):
    """Check if a date is in the archive (before today)."""
    target = datetime.strptime(date_str, '%Y-%m-%d')
    today = datetime(2025, 11, 26)  # Current date
    return target < today

# Examples
print(is_archived('2025-11-21'))  # True (Day 1)
print(is_archived('2025-11-26'))  # False (Today)
print(is_archived('2025-11-27'))  # False (Future)
```

---

## Archive Use Cases

### 1. Testing Historical Views

Use Days 1-5 to test:
- Past game results display
- User ranking history
- Score calculation
- Leaderboard archives

### 2. Simulating User Progress

```python
# Simulate user completing archive games
user_scores = {
    1: 85,  # Day 1 score
    2: 92,  # Day 2 score
    3: 78,  # Day 3 score
    4: 88,  # Day 4 score
    5: 95,  # Day 5 score
}

avg_score = sum(user_scores.values()) / len(user_scores)
print(f"User average over archive: {avg_score:.1f}")
```

### 3. Streak Tracking

```python
# Check if user has played all archive days
archive_days = [1, 2, 3, 4, 5]
user_played_days = [1, 2, 3, 4, 5]  # Example: user played all

streak = len(user_played_days)
print(f"Current streak: {streak} days")
```

### 4. Comparison Analysis

```python
# Compare user rankings vs actual rankings for archive
def analyze_archive_performance(user_rankings, actual_rankings):
    """
    user_rankings: dict of {day: [player_ranks_in_user_order]}
    actual_rankings: dict of {day: [player_ranks_in_actual_order]}
    """
    scores = {}
    for day in user_rankings:
        # Calculate score based on ranking accuracy
        user_order = user_rankings[day]
        actual_order = actual_rankings[day]
        
        # Simple scoring: points for correct positions
        score = sum(1 for i, rank in enumerate(user_order) 
                   if rank == actual_order[i])
        scores[day] = score * 20  # 20 points per correct position
    
    return scores

# Example
user_ranks = {1: [1, 5, 3, 10, 17]}  # User's ranking for Day 1
actual_ranks = {1: [1, 3, 10, 5, 17]}  # Actual ranking
scores = analyze_archive_performance(user_ranks, actual_ranks)
print(f"Day 1 score: {scores[1]}/100")
```

---

## Archive Statistics

### Days 1-5 Summary

**Total Players Featured:** 19 unique players  
**Top 10 Players:** 9 appearances  
**Tier 2 Players:** 7 appearances  
**Tier 3 Players:** 9 appearances  

**Most Featured in Archive:**
- Victor Wembanyama (#1): 2 times (Days 1, 2)
- Robert Williams (#9): 2 times (Days 2, 3)
- Paul Reed (#3): 2 times (Days 1, 4)
- Scottie Barnes (#7): 2 times (Days 3, 5)
- Nikola Jokić (#5): 1 time (Day 1)

---

## Implementation Tips

### 1. Archive Badge/Indicator

```python
def get_day_status(day_num):
    """Return status of a game day."""
    if day_num <= 5:
        return "ARCHIVE"
    elif day_num == 6:
        return "TODAY"
    else:
        return "UPCOMING"

# Display with badge
for day in range(1, 11):
    status = get_day_status(day)
    print(f"Day {day}: {status}")
```

### 2. Archive Navigation

```python
def get_archive_days():
    """Get list of archived days."""
    return list(range(1, 6))  # Days 1-5

def get_archive_dates():
    """Get dates of archived games."""
    schedule = pd.read_csv('data/daily_schedule.csv')
    archive = schedule[schedule['day'] <= 5]
    return archive.groupby('day')['date'].first().tolist()

# Example
dates = get_archive_dates()
print("Archive dates:", dates)
# Output: ['2025-11-21', '2025-11-22', '2025-11-23', '2025-11-24', '2025-11-25']
```

### 3. Archive Replay

```python
def replay_archive_day(day_num):
    """Load an archive day for replay/review."""
    if day_num > 5:
        return None, "Not an archived day"
    
    schedule = pd.read_csv('data/daily_schedule.csv')
    day_data = schedule[schedule['day'] == day_num]
    
    return {
        'day': day_num,
        'date': day_data.iloc[0]['date'],
        'players': day_data[['rank', 'player', 'team']].to_dict('records')
    }, None

# Example
day_info, error = replay_archive_day(3)
if not error:
    print(f"Replaying Day {day_info['day']} ({day_info['date']})")
    for p in day_info['players']:
        print(f"  #{p['rank']} {p['player']}")
```

---

## Regenerating Schedule

If you need to regenerate with a different start date:

```python
# In generate_daily_schedule.py, modify:
start_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')

# Change days=5 to any number:
# days=0  -> Start today (no archive)
# days=7  -> Start 7 days ago (1 week archive)
# days=14 -> Start 14 days ago (2 week archive)
```

---

## Summary

✅ **5-day archive created** (Nov 21-25)  
✅ **Current day is Day 6** (Nov 26 - Today)  
✅ **44 future days** (Nov 27 - Jan 9)  
✅ **All constraints satisfied**  

**Ready to implement archive features!** 🎮

---

**Generated:** November 26, 2025  
**Archive Start:** November 21, 2025  
**Archive Duration:** 5 days  
**Current Day:** Day 6 (November 26, 2025)
