# Quick Start Guide - Player Rankings V3.0

## TL;DR - Just Run This

```bash
cd c:/Users/tmacr/OneDrive/Desktop/Peoples_Champ
python scripts/generate_player_rankings_v3.py
```

**Wait 5-10 minutes**, then check:
- `data/player_rankings_24-25_v3.csv`

---

## What You'll Get

### One Row Per Player

```
Rank  Player                    Score   H2H%    PO_3Y  Traj
1     Nikola Jokić             100.0   99.0%   48     +0.8
2     Shai Gilgeous-Alexander  97.6    96.5%   23     +2.1
3     Giannis Antetokounmpo    95.2    94.8%   45     +0.3
```

### Key Columns

- **Score** - Final ranking score (0-100)
- **H2H%** - Win % in simulated matchups
- **PO_3Y** - Total playoff games over last 3 years
- **Traj** - Performance trend (+improving, -declining)

---

## Quick Analysis

### Load Rankings

```python
import pandas as pd
rankings = pd.read_csv('data/player_rankings_24-25_v3.csv')
```

### Top 10 Players

```python
print(rankings.head(10)[['rank', 'Player', 'final_score', 'h2h_win_rate']])
```

### Playoff Veterans (30+ games in last 3 years)

```python
playoff_vets = rankings[rankings['Total_Playoff_Games_Last_3Y'] >= 30]
print(playoff_vets[['rank', 'Player', 'Total_Playoff_Games_Last_3Y']])
```

### Breakout Players (strong trajectory)

```python
breakout = rankings[rankings['Trajectory_Last_3Y'] > 1.5]
print(breakout[['rank', 'Player', 'Trajectory_Last_3Y']])
```

### Compare Two Players

```python
player1 = rankings[rankings['Player'] == 'Nikola Jokić'].iloc[0]
player2 = rankings[rankings['Player'] == 'Shai Gilgeous-Alexander'].iloc[0]

print(f"Current BPM: {player1['BPM']:.1f} vs {player2['BPM']:.1f}")
print(f"3Y Avg BPM: {player1['Avg_BPM_Last_3Y']:.1f} vs {player2['Avg_BPM_Last_3Y']:.1f}")
print(f"Playoff Games (3Y): {int(player1['Total_Playoff_Games_Last_3Y'])} vs {int(player2['Total_Playoff_Games_Last_3Y'])}")
```

---

## Understanding the Scores

### Final Score Formula

```
Final Score = (Current Season × 60%) + 
              (Historical × 30%) + 
              (H2H Win Rate × 10%)
```

### Score Ranges

- **90-100** - Elite (MVP candidates)
- **80-90** - All-Star level
- **70-80** - Solid starters
- **60-70** - Role players
- **<60** - Bench/limited role

### H2H Win Rate

- **>95%** - Dominant (top 5)
- **85-95%** - Elite (top 20)
- **70-85%** - Very good (top 50)
- **50-70%** - Average
- **<50%** - Below average

---

## Common Questions

### Q: Why is Player X ranked higher than Player Y?

**Check these factors:**

```python
player_x = rankings[rankings['Player'] == 'Player X'].iloc[0]
player_y = rankings[rankings['Player'] == 'Player Y'].iloc[0]

# Current season performance
print(f"Current BPM: {player_x['BPM']} vs {player_y['BPM']}")

# Historical consistency
print(f"3Y Avg: {player_x['Avg_BPM_Last_3Y']} vs {player_y['Avg_BPM_Last_3Y']}")

# Playoff experience
print(f"Playoff Games: {player_x['Total_Playoff_Games_Last_3Y']} vs {player_y['Total_Playoff_Games_Last_3Y']}")

# Trajectory
print(f"Trajectory: {player_x['Trajectory_Last_3Y']:+.2f} vs {player_y['Trajectory_Last_3Y']:+.2f}")
```

### Q: Where's the playoff data?

**Current season playoffs:**
- `Has_Playoff_Data` - Boolean flag
- `Playoff_Games` - Games in 2024-25 playoffs

**Historical playoffs:**
- `Total_Playoff_Games_Last_3Y` - Sum of 21-22, 22-23, 23-24
- `Playoff_Experience_Score` - Weighted by recency

### Q: What does trajectory mean?

**Trajectory** = Performance trend over last 3 years

- **+2.0** = Rapidly improving (breakout player)
- **+0.5** = Steadily improving
- **0.0** = Consistent (no change)
- **-0.5** = Slight decline
- **-2.0** = Significant decline

### Q: How is playoff data weighted?

**Current season (2024-25):**
- Playoff GP/GS/MP count **2x** in totals
- Advanced stats weighted by minutes (playoff minutes count 2x)

**Example:**
```
Regular: 2000 MP, 8.0 BPM
Playoff: 400 MP, 10.0 BPM
Total MP: 2000 + (400 × 2) = 2800
Combined BPM: (8.0×2000 + 10.0×800) / 2800 = 8.57
```

---

## Export to Excel

```python
# Save top 50 to Excel
top_50 = rankings.head(50)
top_50.to_excel('top_50_players.xlsx', index=False)
```

---

## Troubleshooting

### Script fails with "File not found"

**Check data files exist:**
```bash
dir data\Bbref_Adv_24-25.csv
dir data\Bbref_Playoff_Adv_24-25.csv
dir data\Bbref_Adv_21-22.csv
```

### Script takes too long

**Normal:** 5-10 minutes is expected

**To speed up:** Reduce simulations in script (line ~350)

### Player not in rankings

**Possible reasons:**
1. Didn't play in 2024-25
2. Played <10 games
3. Name spelling different

**Check:**
```python
current = pd.read_csv('data/Bbref_Adv_24-25.csv')
print(current['Player'].unique())
```

---

## Next Steps

1. **Run the script** (see top of page)
2. **Load the CSV** in Excel or Python
3. **Explore the data** using queries above
4. **Compare with Ringer** rankings (if available)

---

## Full Documentation

- **Quick Start:** This file
- **Detailed Guide:** `README_V3.md`
- **Methodology:** `RANKING_METHODOLOGY_V2.md`
- **Version Comparison:** `VERSION_COMPARISON.md`

---

**That's it! You're ready to go.** 🚀

**Run:** `python scripts/generate_player_rankings_v3.py`
