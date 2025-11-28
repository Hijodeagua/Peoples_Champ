# Enhanced Player Rankings V2.0 - Quick Start Guide

## What's New? 🎉

1. **Simulated H2H Win % Now Visible** - Direct win probability shown as primary metric
2. **Removed Elo Redundancy** - No more double-counting of head-to-head data
3. **Playoff Data Integrated** - Playoff performance weighted 2x heavier
4. **Multi-Year Tracking** - See players across all seasons (2021-2026)

---

## Quick Start

### Run the Enhanced Rankings

```bash
cd c:/Users/tmacr/OneDrive/Desktop/Peoples_Champ
python scripts/generate_player_rankings_v2.py
```

### Expected Output

```
================================================================================
ENHANCED PLAYER RANKING SYSTEM V2.0
Multi-Year Rankings with Playoff Weighting
================================================================================

1. Filtering players by minimum playing time...
   Found 1500 player-seasons

2. Calculating playing time reliability factors...

3. Calculating composite scores...

4. Analyzing historical trajectories...

5. Running head-to-head simulations...
   Generating head-to-head matchups for 200 players...
   Completed 20/200 players...
   Completed 40/200 players...
   ...

6. Computing final scores...

[OK] Rankings exported to: data/player_rankings_multi_year_v2.csv
[OK] Top 100 exported to: data/player_rankings_top100_v2.json
[OK] Summary exported to: data/rankings_summary_v2.json
```

---

## Output Files

### 1. `player_rankings_multi_year_v2.csv`
Complete rankings with all player-seasons.

**Key Columns:**
- `rank` - Overall ranking
- `Player` - Player name
- `Season` - Season (e.g., "24-25")
- `final_score` - Final ranking score
- `h2h_win_rate` - **Head-to-head win percentage** (0.0 to 1.0)
- `Has_Playoff_Data` - Playoff participation flag
- `BPM`, `VORP`, `PER`, etc. - Advanced stats

### 2. `player_rankings_top100_v2.json`
Top 100 in JSON format for frontend integration.

### 3. `rankings_summary_v2.json`
Methodology summary and top performers.

---

## Understanding the Rankings

### Final Score Formula

```
Final Score = (Composite Score × 50%) + 
              (H2H Win Rate × 100 × 40%) + 
              (Historical Trajectory × 10%)
```

### H2H Win Rate Explained

**What it means:**
- `0.85` = Player wins 85% of simulated matchups against all other players
- `0.50` = Player wins 50% (average)
- `0.99` = Player wins 99% (elite dominance)

**How it's calculated:**
1. Simulate 500 matchups against each opponent
2. Count wins based on offensive, defensive, and overall impact
3. Average win probability across all opponents

**Example:**
```
Player A vs 199 opponents
Wins: 170 matchups on average
H2H Win Rate: 170/199 = 85.4%
```

---

## Playoff Data Weighting

### How It Works

**Playing Time (2x multiplier):**
```
Total Minutes = Regular_MP + (Playoff_MP × 2)
Total Starts = Regular_GS + (Playoff_GS × 2)
Total Games = Regular_G + (Playoff_G × 2)
```

**Advanced Stats (weighted by minutes):**
```
Combined_BPM = (Regular_BPM × Regular_MP + Playoff_BPM × Playoff_MP × 2) / Total_MP
```

**Example:**

| Player | Regular MP | Playoff MP | Total MP | Regular BPM | Playoff BPM | Combined BPM |
|--------|------------|------------|----------|-------------|-------------|--------------|
| Player A | 2000 | 400 | 2800 | 8.0 | 10.0 | 8.57 |

---

## Common Queries

### Get Current Season Rankings

```python
import pandas as pd

rankings = pd.read_csv('data/player_rankings_multi_year_v2.csv')
current = rankings[rankings['Season'] == '25-26']
print(current.head(10))
```

### Find Player's Best Season

```python
player_name = "Nikola Jokić"
player_data = rankings[rankings['Player'] == player_name]
best_season = player_data.nlargest(1, 'final_score')
print(f"{player_name}'s best season:")
print(best_season[['Season', 'final_score', 'h2h_win_rate', 'BPM']])
```

### Compare Playoff vs Non-Playoff Performance

```python
playoff = rankings[rankings['Has_Playoff_Data'] == True]
no_playoff = rankings[rankings['Has_Playoff_Data'] == False]

print(f"Avg score (playoff): {playoff['final_score'].mean():.2f}")
print(f"Avg score (no playoff): {no_playoff['final_score'].mean():.2f}")
print(f"Avg H2H (playoff): {playoff['h2h_win_rate'].mean()*100:.1f}%")
print(f"Avg H2H (no playoff): {no_playoff['h2h_win_rate'].mean()*100:.1f}%")
```

### Track Player Trajectory

```python
player_name = "Shai Gilgeous-Alexander"
player_data = rankings[rankings['Player'] == player_name].sort_values('Season')
print(player_data[['Season', 'BPM', 'h2h_win_rate', 'final_score', 'trajectory']])
```

### Top Playoff Performers

```python
playoff_only = rankings[rankings['Has_Playoff_Data'] == True]
top_playoff = playoff_only.nlargest(20, 'final_score')
print(top_playoff[['rank', 'Player', 'Season', 'final_score', 'h2h_win_rate']])
```

---

## Comparison with V1.0

| Feature | V1.0 | V2.0 |
|---------|------|------|
| **Seasons** | 1 (2025-26 only) | 5 (2021-2026) |
| **Elo Rating** | Yes (35% weight) | **Removed** |
| **H2H Win %** | Hidden (20% weight) | **Visible (40% weight)** |
| **Playoff Data** | Not used | **Weighted 2x** |
| **Players Ranked** | 330 | ~1500 |
| **Composite Weight** | 40% | 50% |
| **Trajectory Weight** | 5% | 10% |

---

## Why These Changes?

### 1. Removed Elo Redundancy

**Problem:** Elo is calculated FROM H2H matchups, so using both = double-counting

**Solution:** Use H2H win rate directly (more transparent)

### 2. Added H2H Win % Column

**Problem:** Win rate was hidden behind Elo conversion

**Solution:** Show it directly - easier to interpret

### 3. Playoff Weighting

**Problem:** Playoff data existed but wasn't used

**Solution:** Weight playoff stats 2x (higher competition level)

### 4. Multi-Year Tracking

**Problem:** Only current season ranked, no historical context

**Solution:** Track all seasons, enable year-over-year comparison

---

## Interpreting Results

### What Makes a High-Ranked Player?

**High Composite Score (50%):**
- Elite BPM, VORP, PER, WS/48
- Efficient shooting (TS%)
- Strong offensive and defensive impact

**High H2H Win Rate (40%):**
- Dominates simulated matchups
- Well-rounded skillset
- Consistent performance

**Positive Trajectory (10%):**
- Improving over time
- Upward career arc
- Not in decline

### Example: Top-Ranked Player

```
Rank: 1
Player: Nikola Jokić
Season: 2023-24
Final Score: 100.0
H2H Win Rate: 99.0%
BPM: 18.2
VORP: 3.0
Trajectory: +0.8
Has_Playoff_Data: Yes
```

**Why #1?**
- Highest BPM and VORP in league
- Wins 99% of simulated matchups
- Strong playoff performance (weighted 2x)
- Positive trajectory (improving)

---

## Troubleshooting

### Script Takes Too Long

**Cause:** H2H simulations are computationally intensive

**Solution:** Reduce `top_n` parameter in `generate_h2h_win_rates()`:
```python
# In generate_player_rankings_v2.py, line ~425
top_players = valid_players.nlargest(150, 'composite_score')  # Reduce from 200
```

### Missing Playoff Data

**Cause:** Some seasons may not have playoff files

**Solution:** Script handles this gracefully - players without playoff data still ranked

### Player Appears Multiple Times

**Expected:** This is by design! Each row is a unique player-season combination

**To get unique players:** Filter by season or aggregate

---

## Next Steps

### 1. Run the Script
```bash
python scripts/generate_player_rankings_v2.py
```

### 2. Explore the Output
```bash
# View top 20
head -n 21 data/player_rankings_multi_year_v2.csv

# Or open in Excel/Google Sheets
```

### 3. Analyze Results
- Compare with Ringer rankings
- Track player trajectories
- Identify playoff performers
- Find breakout seasons

### 4. Integrate with Frontend
```javascript
import rankings from './data/player_rankings_top100_v2.json';

rankings.rankings.forEach(player => {
  console.log(`${player.Player} (${player.Season}): ${player.h2h_win_rate*100}%`);
});
```

---

## Documentation

- **Full Methodology:** `RANKING_METHODOLOGY_V2.md`
- **Change Log:** `RANKING_CHANGES_V2.md`
- **Original System:** `RANKING_METHODOLOGY.md`

---

## Support

### Common Issues

**Q: Why is my favorite player ranked low?**
A: Check their playing time factor, H2H win rate, and trajectory. Low rankings usually indicate limited minutes, poor efficiency, or declining performance.

**Q: Why does the same player appear multiple times?**
A: Each row represents a unique player-season. This allows historical comparison.

**Q: How do I get only current season rankings?**
A: Filter by `Season == '25-26'` in your analysis.

**Q: What does H2H win rate really mean?**
A: It's the average probability that player wins a simulated matchup against all other players. Higher = more dominant.

---

## Summary

V2.0 provides:
- ✅ **More transparent** rankings (visible H2H%)
- ✅ **More accurate** (playoff weighting)
- ✅ **More comprehensive** (multi-year tracking)
- ✅ **Less redundant** (removed Elo)

**Ready to use for:**
- Player evaluation
- Contract analysis
- Trade assessment
- Historical comparison
- Fantasy basketball

---

**Version:** 2.0  
**Last Updated:** November 26, 2025  
**Status:** Production Ready  
**License:** MIT
