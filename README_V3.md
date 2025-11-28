# Player Rankings V3.0 - Quick Start Guide

## What's Different in V3.0? 🎯

**ONE ROW PER PLAYER** - Historical data used as features, not separate rows!

### Key Features

1. ✅ **Single Row Per Player** - Each player appears once (current season only)
2. ✅ **Historical Features** - Past 3 years aggregated as columns
3. ✅ **Playoff Weighting** - Current season playoff stats weighted 2x
4. ✅ **Direct H2H Win %** - Visible as primary metric
5. ✅ **New Columns** - Wins over last 3 years, trajectory, playoff experience

---

## Quick Start

### Run the Script

```bash
cd c:/Users/tmacr/OneDrive/Desktop/Peoples_Champ
python scripts/generate_player_rankings_v3.py
```

### Expected Runtime
- ~5-10 minutes
- Processes current season (2024-25)
- Uses historical data from 2021-22, 2022-23, 2023-24

---

## Output Format

### Example Rankings Table

```
Rank  Player                    Team  Score   H2H%    BPM   VORP  PO_3Y  Traj
1     Nikola Jokić             DEN   100.0   99.0%   18.2  3.0   48     +0.8
2     Shai Gilgeous-Alexander  OKC   97.6    96.5%   13.6  2.3   23     +2.1
3     Giannis Antetokounmpo    MIL   95.2    94.8%   11.3  1.4   45     +0.3
```

**Column Explanations:**
- `PO_3Y` = Total playoff games over last 3 years
- `Traj` = Performance trajectory (positive = improving)

---

## New Historical Features

### Columns Added

| Column | Description | Example |
|--------|-------------|---------|
| `Seasons_Played` | Number of seasons in last 3 years | 3 |
| `Total_Games_Last_3Y` | Total regular season games | 240 |
| `Total_Playoff_Games_Last_3Y` | **Total playoff games** | 48 |
| `Avg_BPM_Last_3Y` | Average BPM over 3 years | 8.5 |
| `Avg_VORP_Last_3Y` | Average VORP over 3 years | 2.1 |
| `Avg_PER_Last_3Y` | Average PER over 3 years | 24.3 |
| `Peak_BPM_Last_3Y` | Best BPM in last 3 years | 10.2 |
| `Trajectory_Last_3Y` | Performance trend slope | +0.8 |
| `Playoff_Experience_Score` | Weighted playoff experience | 32.5 |

### How Historical Features Work

**Example: Player with 3 seasons of data**

```
Season    BPM   VORP  Playoff Games
2021-22   7.5   1.8   12
2022-23   8.2   2.0   16
2023-24   9.1   2.3   20

Calculated Features:
- Avg_BPM_Last_3Y: (7.5 + 8.2 + 9.1) / 3 = 8.27
- Total_Playoff_Games_Last_3Y: 12 + 16 + 20 = 48
- Trajectory_Last_3Y: +0.8 (improving)
- Playoff_Experience_Score: (12×0.33 + 16×0.67 + 20×1.0) = 34.6
  (More recent games weighted higher)
```

---

## Final Score Formula

```
Final Score = (Current Season × 60%) + 
              (Historical × 30%) + 
              (H2H Win Rate × 10%)
```

### Component Breakdown

**1. Current Season (60%)**
- 2024-25 regular season + playoff stats
- Playoff GP/GS/MP weighted 2x
- Composite score from PER, BPM, VORP, WS/48, TS%, etc.

**2. Historical (30%)**
- Avg BPM Last 3 Years (40%)
- Trajectory (20%)
- Playoff Experience Score (20%)
- Consistency (20%)

**3. H2H Win Rate (10%)**
- Direct simulation results
- Average win probability vs all opponents

---

## Understanding the Rankings

### What Makes a Top Player?

**High Current Season Score:**
- Elite stats in 2024-25
- Strong playoff performance (weighted 2x)
- High playing time reliability

**Strong Historical Performance:**
- Consistent BPM over past 3 years
- Positive trajectory (improving)
- Deep playoff runs

**High H2H Win Rate:**
- Dominates simulated matchups
- Well-rounded skillset

### Example: #1 Ranked Player

```
Player: Nikola Jokić
Rank: 1
Final Score: 100.0

Current Season (2024-25):
- BPM: 18.2 (elite)
- VORP: 3.0 (elite)
- Playoff Games: 14
- H2H Win Rate: 99.0%

Historical (Last 3 Years):
- Avg BPM: 17.5 (consistently elite)
- Total Playoff Games: 48 (deep runs)
- Trajectory: +0.8 (still improving)
- Peak BPM: 18.2 (current season is peak)

Why #1?
✅ Best current season stats
✅ Consistent historical excellence
✅ Strong playoff performer
✅ Still improving (positive trajectory)
```

---

## Common Queries

### Filter by Playoff Experience

```python
import pandas as pd

rankings = pd.read_csv('data/player_rankings_24-25_v3.csv')

# Players with 30+ playoff games in last 3 years
playoff_vets = rankings[rankings['Total_Playoff_Games_Last_3Y'] >= 30]
print(playoff_vets[['rank', 'Player', 'Total_Playoff_Games_Last_3Y', 'final_score']])
```

### Find Breakout Players

```python
# Players with strong positive trajectory
breakout = rankings[rankings['Trajectory_Last_3Y'] > 1.0]
print(breakout[['rank', 'Player', 'Trajectory_Last_3Y', 'Avg_BPM_Last_3Y']])
```

### Compare Current vs Historical Performance

```python
# Players performing better than their 3-year average
rankings['BPM_vs_Avg'] = rankings['BPM'] - rankings['Avg_BPM_Last_3Y']
overperforming = rankings[rankings['BPM_vs_Avg'] > 2.0]
print(overperforming[['rank', 'Player', 'BPM', 'Avg_BPM_Last_3Y', 'BPM_vs_Avg']])
```

### Identify Playoff Specialists

```python
# Players who excel in playoffs
rankings['Playoff_Ratio'] = rankings['Playoff_Games'] / rankings['G']
playoff_specialists = rankings[rankings['Playoff_Ratio'] > 0.15]
print(playoff_specialists[['rank', 'Player', 'Playoff_Games', 'Playoff_Ratio']])
```

---

## Comparison: V2.0 vs V3.0

| Feature | V2.0 | V3.0 |
|---------|------|------|
| **Rows per player** | Multiple (one per season) | **One (current season only)** |
| **Historical data** | Separate rows | **Aggregated as features** |
| **Output size** | ~1500 rows | ~330 rows |
| **Current season weight** | 50% | **60%** |
| **Historical weight** | 10% (trajectory only) | **30%** (multiple features) |
| **H2H weight** | 40% | **10%** |
| **New columns** | None | **8+ historical features** |

### Why V3.0?

**V2.0 Issues:**
- Multiple rows per player = confusing
- Hard to compare players directly
- Historical data scattered across rows

**V3.0 Solutions:**
- One row per player = clean comparison
- Historical features in same row
- Easy to filter and analyze

---

## Output Files

### 1. `player_rankings_24-25_v3.csv`

Main rankings file with all columns:

```csv
rank,Player,Team,final_score,h2h_win_rate,Total_Playoff_Games_Last_3Y,Trajectory_Last_3Y,...
1,Nikola Jokić,DEN,100.0,0.990,48,+0.8,...
2,Shai Gilgeous-Alexander,OKC,97.6,0.965,23,+2.1,...
```

### 2. `player_rankings_top100_24-25_v3.json`

Top 100 in JSON format:

```json
{
  "generated_at": "2025-11-26T03:00:00",
  "season": "24-25",
  "version": "3.0",
  "rankings": [
    {
      "rank": 1,
      "Player": "Nikola Jokić",
      "final_score": 100.0,
      "h2h_win_rate": 0.990,
      "Total_Playoff_Games_Last_3Y": 48,
      ...
    }
  ]
}
```

### 3. `rankings_summary_24-25_v3.json`

Methodology and top performers:

```json
{
  "total_players": 330,
  "season": "24-25",
  "historical_seasons": ["21-22", "22-23", "23-24"],
  "methodology": {
    "current_season_weight": 0.60,
    "historical_weight": 0.30,
    "h2h_win_rate_weight": 0.10
  }
}
```

---

## Validation

### Check Output Format

```python
import pandas as pd

rankings = pd.read_csv('data/player_rankings_24-25_v3.csv')

# Should be one row per player
player_counts = rankings['Player'].value_counts()
assert player_counts.max() == 1, "Multiple rows per player found!"
print("✅ One row per player confirmed")

# Check historical columns exist
required_cols = [
    'Total_Playoff_Games_Last_3Y',
    'Avg_BPM_Last_3Y',
    'Trajectory_Last_3Y'
]
for col in required_cols:
    assert col in rankings.columns, f"Missing column: {col}"
print("✅ Historical columns present")

# Check H2H win rate is visible
assert 'h2h_win_rate' in rankings.columns
assert rankings['h2h_win_rate'].between(0, 1).all()
print("✅ H2H win rate valid")
```

---

## Use Cases

### 1. Fantasy Basketball Draft

**Strategy:** Target players with:
- High final score (overall value)
- Positive trajectory (improving)
- Playoff experience (reliable in big games)

```python
# Draft targets
draft_targets = rankings[
    (rankings['final_score'] > 80) &
    (rankings['Trajectory_Last_3Y'] > 0) &
    (rankings['Total_Playoff_Games_Last_3Y'] > 20)
]
```

### 2. Trade Evaluation

**Compare two players:**

```python
player1 = rankings[rankings['Player'] == 'Player A'].iloc[0]
player2 = rankings[rankings['Player'] == 'Player B'].iloc[0]

print(f"Current: {player1['BPM']:.1f} vs {player2['BPM']:.1f}")
print(f"Historical: {player1['Avg_BPM_Last_3Y']:.1f} vs {player2['Avg_BPM_Last_3Y']:.1f}")
print(f"Trajectory: {player1['Trajectory_Last_3Y']:+.2f} vs {player2['Trajectory_Last_3Y']:+.2f}")
```

### 3. Contract Analysis

**Identify undervalued players:**

```python
# Players with strong trajectory but lower rank
undervalued = rankings[
    (rankings['rank'] > 30) &
    (rankings['Trajectory_Last_3Y'] > 1.5) &
    (rankings['Avg_BPM_Last_3Y'] > 3.0)
]
```

### 4. Playoff Prediction

**Find playoff performers:**

```python
# Players who excel in playoffs
playoff_performers = rankings.nlargest(20, 'Playoff_Experience_Score')
print(playoff_performers[['rank', 'Player', 'Playoff_Experience_Score', 'Total_Playoff_Games_Last_3Y']])
```

---

## Troubleshooting

### Script Takes Too Long

**Solution:** Reduce H2H simulation count

```python
# In generate_player_rankings_v3.py, line ~350
top_players = players_df.nlargest(100, 'composite_score')  # Reduce from 150
```

### Missing Historical Data

**Issue:** Player has no data for some seasons

**Expected:** Script handles this gracefully
- Missing seasons = lower `Seasons_Played` value
- Averages calculated from available data only

### Player Not in Rankings

**Possible Reasons:**
1. Didn't play in 2024-25 season
2. Played fewer than 10 games (minimum threshold)
3. Name spelling mismatch

**Check:**
```python
# See all players in current season
current_players = pd.read_csv('data/Bbref_Adv_24-25.csv')
print(current_players['Player'].unique())
```

---

## Next Steps

### 1. Run the Script

```bash
python scripts/generate_player_rankings_v3.py
```

### 2. Explore Results

```python
import pandas as pd

rankings = pd.read_csv('data/player_rankings_24-25_v3.csv')

# Top 10
print(rankings.head(10))

# Playoff veterans
print(rankings.nlargest(20, 'Total_Playoff_Games_Last_3Y'))

# Rising stars
print(rankings.nlargest(20, 'Trajectory_Last_3Y'))
```

### 3. Compare with Ringer

```python
# See where our rankings differ
ringer_comparison = rankings[rankings['ringer_rank'].notna()]
ringer_comparison['diff'] = ringer_comparison['rank'] - ringer_comparison['ringer_rank']
print(ringer_comparison[['rank', 'Player', 'ringer_rank', 'diff']].head(20))
```

---

## Summary

### What You Get

✅ **One row per player** (current season)  
✅ **Historical features** (last 3 years aggregated)  
✅ **Playoff weighting** (2x for current season)  
✅ **Direct H2H win %** (visible column)  
✅ **New metrics** (playoff games, trajectory, experience)  

### Perfect For

- Player evaluation
- Fantasy basketball
- Trade analysis
- Contract assessment
- Playoff prediction
- Historical comparison

---

**Version:** 3.0  
**Season:** 2024-25  
**Historical Data:** 2021-22, 2022-23, 2023-24  
**Status:** Production Ready  

**Ready to run!** 🚀
