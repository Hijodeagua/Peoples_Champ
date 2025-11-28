# Basketball Reference Scraper

This directory contains Python scripts to scrape advanced statistics from Basketball Reference.

## Setup

1. Install required Python packages:
```bash
pip install requests beautifulsoup4 pandas
```

## Usage

### Scrape Advanced Stats

Run the scraper to get BPM, VORP, PER, WS/48, and other advanced metrics:

```bash
cd scripts
python scrape_bbref_advanced.py
```

This will create CSV files in the `data/` directory:
- `data/advanced_stats_2023-24.csv`
- `data/advanced_stats_2024-25.csv`

### Output Format

The CSV files will contain these columns:
- Player
- Pos (Position)
- Age
- Tm (Team)
- G (Games)
- MP (Minutes Played)
- **PER** (Player Efficiency Rating)
- TS% (True Shooting Percentage)
- 3PAr (3-Point Attempt Rate)
- FTr (Free Throw Rate)
- ORB%, DRB%, TRB% (Rebound percentages)
- AST% (Assist Percentage)
- STL%, BLK% (Steal and Block percentages)
- TOV% (Turnover Percentage)
- USG% (Usage Percentage)
- OWS, DWS, **WS** (Win Shares)
- **WS/48** (Win Shares per 48 minutes)
- **OBPM** (Offensive Box Plus Minus)
- **DBPM** (Defensive Box Plus Minus)
- **BPM** (Box Plus Minus)
- **VORP** (Value Over Replacement Player)
- Season

## Next Steps

After scraping the data:

1. Copy the CSV files to `frontend/public/data/`:
```bash
Copy-Item data/advanced_stats_*.csv frontend/public/data/
```

2. Update the ranking model in `frontend/src/data/rankingModel.ts` to load and use these advanced stats

3. The model will then use real BPM, VORP, PER, etc. instead of just Win Shares

## Notes

- Be respectful to Basketball Reference servers (the script includes 3-second delays)
- The scraper may need updates if Basketball Reference changes their HTML structure
- Some players may have missing data for certain metrics
