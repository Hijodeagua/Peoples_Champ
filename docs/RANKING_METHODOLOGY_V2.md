# Enhanced Player Ranking System V2.0

## Executive Summary

This document describes the enhanced player ranking methodology that addresses key improvements:

1. **Multi-Year Player Tracking** - Players can appear multiple times across different seasons
2. **Playoff Performance Weighting** - Playoff stats weighted 2x heavier than regular season
3. **Direct H2H Win Percentage** - Removed Elo rating redundancy, using simulated win rate directly
4. **Enhanced Transparency** - H2H win % visible as a primary ranking component

---

## Key Changes from V1.0

### 1. Removed Elo Rating Redundancy

**Problem in V1.0:**
- Both Elo rating (35%) and H2H win rate (20%) were used
- Elo is calculated FROM H2H matchups, creating circular logic
- This double-counted the same information

**Solution in V2.0:**
- Removed Elo rating entirely
- Use direct H2H win rate (40% weight)
- More transparent and easier to understand

### 2. Multi-Year Player Tracking

**Problem in V1.0:**
- Only ranked current season (2025-26)
- Lost historical context
- Couldn't compare player performance across years

**Solution in V2.0:**
- Track players across all 5 seasons (2021-22 to 2025-26)
- Same player can appear multiple times
- Enables year-over-year comparison
- Example: "Nikola Jokić 2023-24" vs "Nikola Jokić 2024-25"

### 3. Playoff Performance Weighting

**Problem in V1.0:**
- Playoff data existed but wasn't used
- Regular season and playoffs treated equally
- Didn't account for elevated competition

**Solution in V2.0:**
- Playoff games/starts/minutes weighted 2x
- Advanced stats weighted by minutes (playoff minutes count 2x)
- Playing time reliability factor accounts for playoff experience
- Formula: `Total_MP = Regular_MP + (Playoff_MP × 2)`

### 4. Visible H2H Win Percentage

**Problem in V1.0:**
- H2H win rate was calculated but not prominently displayed
- Hidden behind Elo conversion

**Solution in V2.0:**
- H2H win % shown as primary column in rankings
- Direct interpretation: "Player X wins 85% of simulated matchups"
- No conversion needed

---

## Ranking Formula V2.0

### Final Score Calculation

```
Final Score = (Composite Score × 50%) + 
              (H2H Win Rate × 100 × 40%) + 
              (Historical Trajectory × 10%)
```

**Weight Distribution:**
- **Composite Score: 50%** - Statistical excellence
- **H2H Win Rate: 40%** - Head-to-head dominance
- **Historical Trajectory: 10%** - Career trend

---

## Component Breakdown

### 1. Composite Score (50%)

Weighted combination of advanced metrics, normalized using z-scores:

| Metric | Weight | Description |
|--------|--------|-------------|
| **BPM** | 20% | Box Plus/Minus (overall impact) |
| **VORP** | 20% | Value Over Replacement Player |
| **PER** | 15% | Player Efficiency Rating |
| **WS/48** | 15% | Win Shares per 48 minutes |
| **TS%** | 10% | True Shooting Percentage |
| **OBPM** | 7.5% | Offensive Box Plus/Minus |
| **DBPM** | 7.5% | Defensive Box Plus/Minus |
| **USG%** | 5% | Usage Rate |

**Normalization:**
- Each metric converted to z-score: `(value - league_mean) / league_std`
- Ensures fair comparison across different stat scales
- Weighted sum multiplied by playing time reliability factor

**Playing Time Reliability Factor:**
```
Minutes Factor = min(1.0, Total_MP / 500)
Starts Factor = min(1.0, Total_GS / 20)
Games Factor = min(1.0, Total_G / 30)

Playing Time Factor = (Minutes × 0.5) + (Starts × 0.3) + (Games × 0.2)
Minimum Floor = 0.3
```

**Note:** Playoff minutes/starts/games are already weighted 2x before this calculation.

---

### 2. Head-to-Head Win Rate (40%)

Direct simulation-based win probability against all other players.

**Simulation Process:**

For each matchup between Player A and Player B:

1. **Calculate Offensive Score:**
   ```
   Offense = (PER × 0.3) + (OBPM × 5) + (TS% × 50) + (USG% × 20)
   ```

2. **Calculate Defensive Score:**
   ```
   Defense = (DBPM × 5) + (STL% × 100) + (BLK% × 100)
   ```

3. **Calculate Overall Impact:**
   ```
   Impact = (BPM × 2) + (VORP × 5) + (WS/48 × 50)
   ```

4. **Combined Score:**
   ```
   Total = Offense + Defense + Impact
   ```

5. **Monte Carlo Simulation:**
   - Run 500 simulations per matchup
   - Add 15% variance to account for game-to-game variability
   - Sample from normal distribution: `N(Total, Total × 0.15)`
   - Count wins for Player A

6. **Calculate Win Rate:**
   ```
   H2H Win Rate = Average(Win Probability vs All Opponents)
   ```

**Example:**
- Player ranks in top 200 by composite score
- Simulated against 199 other players
- Wins 170 matchups on average
- H2H Win Rate = 170/199 = 85.4%

---

### 3. Historical Trajectory (10%)

Performance trend across multiple seasons using linear regression.

**Calculation:**
1. Extract BPM values for player across all available seasons
2. Fit linear trend line: `BPM = slope × season + intercept`
3. Slope represents trajectory:
   - **Positive slope** = Improving player
   - **Negative slope** = Declining player
   - **Zero slope** = Consistent player

**Example:**
```
Player: Shai Gilgeous-Alexander
Seasons: 21-22, 22-23, 23-24, 24-25, 25-26
BPM Values: [5.2, 7.8, 9.2, 12.8, 13.6]
Trajectory: +2.1 (strong upward trend)
```

**Requirements:**
- Minimum 2 seasons of data
- Missing seasons ignored
- Only BPM used (most comprehensive single metric)

---

## Playoff Data Integration

### How Playoff Stats Are Weighted

**Playing Time (2x multiplier):**
```python
Total_G = Regular_G + (Playoff_G × 2)
Total_GS = Regular_GS + (Playoff_GS × 2)
Total_MP = Regular_MP + (Playoff_MP × 2)
```

**Advanced Stats (weighted average by minutes):**
```python
Regular_Weight = Regular_MP
Playoff_Weight = Playoff_MP × 2
Total_Weight = Regular_Weight + Playoff_Weight

Combined_Stat = (Regular_Stat × Regular_Weight + Playoff_Stat × Playoff_Weight) / Total_Weight
```

**Example:**

| Stat | Regular Season | Playoffs | Combined |
|------|----------------|----------|----------|
| MP | 2000 | 400 | 2800 (2000 + 400×2) |
| BPM | 8.0 | 10.0 | 8.57 |

BPM Calculation:
```
Combined_BPM = (8.0 × 2000 + 10.0 × 800) / 2800 = 8.57
```

**Rationale:**
- Playoff competition is significantly higher
- Playoff performance more predictive of true skill
- 2x multiplier balances regular season volume with playoff quality

---

## Multi-Year Tracking

### Player-Season Format

Each row represents a unique player-season combination:

| Rank | Player | Season | Team | Score | H2H Win % |
|------|--------|--------|------|-------|-----------|
| 1 | Nikola Jokić | 2023-24 | DEN | 100.0 | 99.0% |
| 2 | Shai Gilgeous-Alexander | 2024-25 | OKC | 97.6 | 96.5% |
| 3 | Nikola Jokić | 2024-25 | DEN | 95.2 | 94.8% |

### Benefits

1. **Historical Comparison**
   - See how players evolved over time
   - Identify breakout seasons
   - Track decline or improvement

2. **Peak Performance Identification**
   - Find player's best season
   - Compare peaks across eras
   - Contextualize current performance

3. **Trajectory Validation**
   - Verify trajectory calculations
   - See actual year-over-year changes
   - Identify anomalies

4. **Ringer Comparison Across Years**
   - Compare our rankings to Ringer for multiple seasons
   - See where disagreements occur historically
   - Validate methodology consistency

---

## Output Files

### 1. `player_rankings_multi_year_v2.csv`

Complete rankings with all player-seasons:

**Columns:**
- `rank` - Overall ranking (1 to N)
- `Player` - Player name
- `Season` - Season (e.g., "24-25")
- `Team` - Team abbreviation
- `Pos` - Position
- `Age` - Player age
- `G` - Total games (playoff weighted 2x)
- `GS` - Total games started (playoff weighted 2x)
- `MP` - Total minutes (playoff weighted 2x)
- `Has_Playoff_Data` - Boolean flag
- `final_score` - Final ranking score
- `composite_score` - Statistical composite
- `h2h_win_rate` - Head-to-head win percentage (0.0 to 1.0)
- `playing_time_factor` - Reliability factor (0.3 to 1.0)
- `trajectory` - Historical trend slope
- `PER`, `BPM`, `VORP`, `WS/48`, `TS%`, `OBPM`, `DBPM` - Advanced stats
- `ringer_rank` - Ringer ranking (if available)

### 2. `player_rankings_top100_v2.json`

Top 100 player-seasons in JSON format for frontend integration.

**Structure:**
```json
{
  "generated_at": "2025-11-26T03:00:00",
  "version": "2.0",
  "methodology": "Multi-year rankings with playoff weighting and direct H2H win rates",
  "rankings": [
    {
      "rank": 1,
      "Player": "Nikola Jokić",
      "Season": "2023-24",
      "Team": "DEN",
      "final_score": 100.0,
      "h2h_win_rate": 0.99,
      ...
    }
  ]
}
```

### 3. `rankings_summary_v2.json`

Methodology summary and top performers.

**Structure:**
```json
{
  "total_player_seasons": 1500,
  "unique_players": 450,
  "seasons_covered": ["21-22", "22-23", "23-24", "24-25", "25-26"],
  "top_10": [...],
  "methodology": {
    "composite_score_weight": 0.50,
    "h2h_win_rate_weight": 0.40,
    "trajectory_weight": 0.10,
    "playoff_minutes_multiplier": 2.0
  },
  "metric_weights": {...}
}
```

---

## Usage Examples

### Running the Script

```bash
cd c:/Users/tmacr/OneDrive/Desktop/Peoples_Champ
python scripts/generate_player_rankings_v2.py
```

### Analyzing Results

**Find a player's best season:**
```python
import pandas as pd

rankings = pd.read_csv('data/player_rankings_multi_year_v2.csv')
jokic = rankings[rankings['Player'] == 'Nikola Jokić']
best_season = jokic.nlargest(1, 'final_score')
print(best_season[['Season', 'final_score', 'h2h_win_rate']])
```

**Compare playoff vs non-playoff performance:**
```python
playoff_players = rankings[rankings['Has_Playoff_Data'] == True]
non_playoff = rankings[rankings['Has_Playoff_Data'] == False]

print(f"Avg score (playoff): {playoff_players['final_score'].mean():.2f}")
print(f"Avg score (no playoff): {non_playoff['final_score'].mean():.2f}")
```

**Track trajectory:**
```python
sga = rankings[rankings['Player'] == 'Shai Gilgeous-Alexander']
sga_sorted = sga.sort_values('Season')
print(sga_sorted[['Season', 'BPM', 'final_score', 'trajectory']])
```

---

## Advantages of V2.0

### 1. Eliminates Redundancy
- **V1.0:** Elo (35%) + H2H (20%) = 55% from same source
- **V2.0:** H2H (40%) = direct, no double-counting

### 2. Improved Transparency
- **V1.0:** Elo rating obscures underlying win probabilities
- **V2.0:** Direct win % is intuitive and interpretable

### 3. Playoff Recognition
- **V1.0:** Playoff data ignored
- **V2.0:** Playoff performance weighted 2x

### 4. Historical Context
- **V1.0:** Single season snapshot
- **V2.0:** Multi-year tracking enables trend analysis

### 5. Better Playing Time Adjustment
- **V1.0:** Simple minutes threshold
- **V2.0:** Composite factor (minutes + starts + games) with playoff weighting

---

## Limitations and Future Improvements

### Current Limitations

1. **Small Sample Sizes**
   - Early-season data may be volatile
   - Minimum thresholds help but don't eliminate noise

2. **Context-Blind**
   - Doesn't account for team quality
   - Ignores coaching systems
   - No injury adjustments

3. **Linear Trajectory Assumption**
   - May miss non-linear career arcs
   - Doesn't predict future breakouts

4. **Position Bias**
   - Centers naturally excel in some metrics (blocks, rebounds)
   - Guards may be undervalued in defensive stats

### Potential Enhancements

1. **Position-Adjusted Rankings**
   - Separate rankings by position
   - Position-specific metric weights

2. **Team Context Adjustment**
   - Factor in team offensive/defensive rating
   - Adjust for pace and style

3. **Clutch Performance**
   - Add late-game stats
   - Weight close-game performance

4. **Injury Adjustment**
   - Penalize injury-prone players
   - Adjust for games missed

5. **Confidence Intervals**
   - Add uncertainty ranges to rankings
   - Show statistical significance

6. **Playoff Round Weighting**
   - Weight Finals minutes more than first round
   - Account for opponent strength

---

## Comparison with Ringer Rankings

### Methodology Differences

| Aspect | Our System V2.0 | Ringer Top 100 |
|--------|-----------------|----------------|
| **Data Source** | Basketball Reference stats | Expert opinions + stats |
| **Subjectivity** | Fully objective | Subjective elements |
| **Playoff Weight** | 2x multiplier | Unknown |
| **Multi-Year** | Yes, all seasons | Single snapshot |
| **H2H Simulation** | 500 simulations per matchup | N/A |
| **Transparency** | Fully documented | Limited |

### Expected Divergences

1. **Young Players**
   - Our system: Based on current stats
   - Ringer: May factor in potential

2. **Veterans**
   - Our system: Trajectory may show decline
   - Ringer: May weight reputation/experience

3. **Role Players**
   - Our system: Efficiency-focused
   - Ringer: May undervalue specialists

4. **Superstars**
   - Our system: Stats-driven
   - Ringer: May factor in "clutch gene" and intangibles

---

## Technical Details

### Performance Metrics

- **Runtime:** ~5-10 minutes (depends on player count)
- **Simulations:** ~500 per matchup × 200 players × 199 opponents = ~20M simulations
- **Memory:** ~500MB peak usage
- **Output Size:** ~2-3MB total

### Dependencies

```python
pandas >= 1.5.0
numpy >= 1.23.0
pathlib (built-in)
json (built-in)
datetime (built-in)
```

### Data Requirements

**Required Files:**
- `data/Bbref_Adv_21-22.csv`
- `data/Bbref_Adv_22-23.csv`
- `data/Bbref_Adv_23-24.csv`
- `data/Bbref_Adv_24-25.csv`
- `data/Bbref_Adv_25-26.csv`
- `data/Bbref_Playoff_Adv_21-22.csv`
- `data/Bbref_Playoff_Adv_22-23.csv`
- `data/Bbref_Playoff_Adv_23-24.csv`
- `data/Bbref_Playoff_Adv_24-25.csv`

**Optional Files:**
- `data/ringer_top_100.csv` (for comparison)

---

## Conclusion

The Enhanced Player Ranking System V2.0 provides a more transparent, comprehensive, and accurate assessment of NBA player performance by:

1. **Removing redundancy** between Elo and H2H win rates
2. **Properly weighting playoff performance** at 2x regular season
3. **Tracking players across multiple seasons** for historical context
4. **Displaying H2H win percentage** as a primary, interpretable metric

This system is designed to be objective, reproducible, and transparent while capturing the multi-dimensional nature of basketball excellence.

---

**Version:** 2.0  
**Last Updated:** November 26, 2025  
**Author:** Peoples_Champ Analytics Team  
**License:** MIT
