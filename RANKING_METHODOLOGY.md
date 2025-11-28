# Player Ranking Methodology - 2025-26 NBA Season

## Overview

This ranking system uses a comprehensive, multi-faceted approach to evaluate NBA players based on advanced statistics, head-to-head simulations, and historical performance trends. The system is designed to provide objective, data-driven rankings that account for both current performance and long-term value.

---

## Final Ranking Formula

The **Final Score** for each player is calculated as:

```
Final Score = (Composite Score × 0.40) + 
              (Elo Rating / 1500 × 0.35) + 
              (H2H Win Rate × 100 × 0.20) + 
              (Historical Trajectory × 0.05)
```

### Component Weights:
- **Composite Score: 40%** - Statistical performance metrics
- **Elo Rating: 35%** - Head-to-head matchup strength
- **H2H Win Rate: 20%** - Overall dominance vs. league
- **Historical Trajectory: 5%** - Performance trend over time

---

## 1. Composite Score (40% Weight)

The Composite Score evaluates a player's statistical performance using normalized (z-score) advanced metrics from Basketball Reference.

### Metric Weights:
| Metric | Weight | Description |
|--------|--------|-------------|
| **BPM** (Box Plus/Minus) | 20% | Overall impact on team performance per 100 possessions |
| **VORP** (Value Over Replacement) | 20% | Total value contributed above replacement-level player |
| **PER** (Player Efficiency Rating) | 15% | Per-minute productivity rating |
| **WS/48** (Win Shares per 48) | 15% | Contribution to team wins per 48 minutes |
| **TS%** (True Shooting %) | 10% | Shooting efficiency including 2PT, 3PT, and FT |
| **OBPM** (Offensive BPM) | 7.5% | Offensive impact per 100 possessions |
| **DBPM** (Defensive BPM) | 7.5% | Defensive impact per 100 possessions |
| **USG%** (Usage Rate) | 5% | Percentage of team plays used while on court |

### Calculation Method:
1. For each metric, calculate the league average (μ) and standard deviation (σ)
2. Compute z-score for each player: `z = (player_value - μ) / σ`
3. Multiply each z-score by its weight
4. Sum all weighted z-scores to get Composite Score

**Why this matters:** Z-score normalization ensures that all metrics are on the same scale, preventing any single stat from dominating the rankings. Players who excel across multiple dimensions receive higher scores.

---

## 2. Elo Rating System (35% Weight)

The Elo rating system, adapted from chess, ranks players based on simulated head-to-head matchup probabilities.

### Head-to-Head Simulation Process:

For each matchup between Player A and Player B:

#### Offensive Score Calculation:
```
Offensive Score = (PER × 0.3) + 
                  (OBPM × 5) + 
                  (TS% × 50) + 
                  (USG% × 20)
```

#### Defensive Score Calculation:
```
Defensive Score = (DBPM × 5) + 
                  (STL% × 100) + 
                  (BLK% × 100)
```

#### Overall Impact Score:
```
Impact Score = (BPM × 2) + 
               (VORP × 5) + 
               (WS/48 × 50)
```

#### Total Player Score:
```
Total Score = Offensive Score + Defensive Score + Impact Score
```

### Monte Carlo Simulation:
- **500 simulations** per matchup
- Each simulation adds **15% variance** (standard deviation) to account for game-to-game variability
- Win probability = (# of simulations won) / 500

### Elo Rating Updates:
- Initial rating: **1500** for all players
- K-factor: **32** (determines rating volatility)
- Expected score: `E = 1 / (1 + 10^((Rating_B - Rating_A) / 400))`
- Rating update: `New_Rating = Old_Rating + K × (Actual_Win_Prob - Expected_Score)`

**Why this matters:** Elo ratings provide a relative strength measure that accounts for the quality of competition. A player who dominates elite opponents receives a higher rating than one who only performs well against weaker players.

---

## 3. Head-to-Head Win Rate (20% Weight)

The H2H Win Rate represents a player's average win probability against all other active players in the league.

### Calculation:
```
H2H Win Rate = Σ(Win_Probability_vs_Player_i) / Total_Players
```

For the top 150 players by Composite Score:
- Generate a **150×150 matchup matrix**
- Each cell contains the win probability from the Monte Carlo simulations
- Average each player's row to get their overall win rate

**Why this matters:** This metric captures overall dominance. Elite players should have high win rates against the entire league, not just specific matchups.

---

## 4. Historical Trajectory (5% Weight)

The Historical Trajectory measures a player's performance trend over the past 4 seasons (2021-22 through 2024-25).

### Calculation Method:
1. Extract player's **BPM** (Box Plus/Minus) for each available season
2. Fit a linear regression: `BPM = slope × season + intercept`
3. The **slope** represents the trajectory:
   - **Positive slope**: Improving player
   - **Negative slope**: Declining player
   - **Zero slope**: Consistent performance

### Example:
- Player with BPM progression: [2.0, 3.5, 5.0, 6.5]
- Slope ≈ +1.5 per season → Strong upward trajectory

**Why this matters:** Young players on upward trajectories may be undervalued by current-season stats alone. Veterans with declining trajectories may be overvalued. This component provides forward-looking context.

---

## Data Sources & Requirements

### Current Season Data (2025-26):
- **Minimum games played:** 10 games
- **Source:** Basketball Reference Advanced Stats
- **Total players ranked:** 330

### Historical Data (2021-22 through 2024-25):
- Used for trajectory analysis
- Players without historical data receive trajectory = 0

### Ringer Top 100 Integration:
- External rankings included for comparison
- Does not affect final score calculation

---

## Advantages of This Methodology

### 1. **Multi-Dimensional Evaluation**
- Combines offensive, defensive, and overall impact metrics
- No single stat dominates the rankings

### 2. **Context-Aware**
- Elo ratings account for strength of competition
- Historical trajectory provides forward-looking insight

### 3. **Simulation-Based**
- Monte Carlo simulations capture variability and uncertainty
- More robust than deterministic comparisons

### 4. **Transparent & Reproducible**
- All weights and formulas are documented
- Results can be independently verified

### 5. **Position-Agnostic**
- Rankings compare players across all positions
- Metrics are normalized to account for positional differences

---

## Limitations & Considerations

### 1. **Sample Size**
- Early-season rankings (based on ~15-20 games) have higher variance
- Rankings stabilize as season progresses

### 2. **Context Factors Not Captured**
- Team system fit
- Injury history
- Playoff performance
- Clutch performance
- Leadership/intangibles

### 3. **Statistical Biases**
- Centers naturally excel in rebounding/blocking metrics
- Guards naturally excel in assist/steal metrics
- Z-score normalization mitigates but doesn't eliminate this

### 4. **Historical Trajectory Limitations**
- Assumes linear trends (may not capture breakout/decline years)
- Players with <2 seasons of data receive trajectory = 0

---

## Interpreting the Rankings

### Top Tier (Final Score > 19.0):
Elite players who dominate across all dimensions. These are MVP-caliber talents.

### Star Tier (Final Score 16.0-19.0):
All-Star level players with strong overall impact. Franchise cornerstones.

### Starter Tier (Final Score 13.0-16.0):
High-quality starters who contribute significantly to winning.

### Rotation Tier (Final Score 10.0-13.0):
Solid rotation players with specific strengths.

### Depth Tier (Final Score < 10.0):
Role players and bench contributors.

---

## Example: Top 5 Breakdown

### 1. Victor Wembanyama (Final Score: 21.04)
- **Composite Score:** 1.74 (elite across all metrics)
- **Elo Rating:** 2062 (highest in league)
- **H2H Win Rate:** 99.0% (dominates nearly all matchups)
- **Trajectory:** +1.3 (strong improvement trend)

### 2. Paul Reed (Final Score: 20.36)
- **Composite Score:** 1.54 (strong efficiency metrics)
- **Elo Rating:** 2029 (elite matchup performance)
- **H2H Win Rate:** 96.3% (extremely dominant)
- **Trajectory:** +0.29 (steady improvement)

### 3. Shai Gilgeous-Alexander (Final Score: 20.36)
- **Composite Score:** 3.79 (highest in league - elite BPM/VORP)
- **Elo Rating:** 1951 (very strong)
- **H2H Win Rate:** 91.3% (dominant)
- **Trajectory:** +2.6 (exceptional growth)

---

## Future Enhancements

### Potential Additions:
1. **Clutch Performance Metrics** - Performance in close games
2. **Playoff Adjustment** - Weight playoff performance more heavily
3. **Injury-Adjusted Value** - Account for games missed
4. **Team Context** - Adjust for team quality/system
5. **Position-Specific Rankings** - Separate rankings by position
6. **Confidence Intervals** - Provide uncertainty ranges for rankings
7. **Predictive Modeling** - Forecast future performance

---

## Technical Implementation

### Tools & Libraries:
- **Python 3.14**
- **pandas** - Data manipulation
- **numpy** - Numerical computations
- **pathlib** - File handling

### Performance:
- **150×150 matchup matrix** = 22,500 matchups
- **500 simulations per matchup** = 11.25 million simulations
- **Runtime:** ~2-3 minutes on standard hardware

### Output Files:
1. **player_rankings_2025-26.csv** - Complete rankings with all metrics
2. **player_rankings_top100.json** - Top 100 in JSON format
3. **rankings_summary.json** - Methodology summary and top 10

---

## Conclusion

This ranking system provides a comprehensive, objective evaluation of NBA players using advanced statistics, simulation-based matchup analysis, and historical performance trends. While no ranking system is perfect, this methodology balances multiple dimensions of player value to produce robust, defensible rankings that can inform fantasy basketball decisions, trade evaluations, and general basketball analysis.

The system is designed to be transparent, reproducible, and adaptable to future enhancements as new data and methodologies become available.

---

**Generated:** 2025-26 NBA Season  
**Total Players Ranked:** 330  
**Methodology Version:** 1.0  
**Last Updated:** November 26, 2025
