# Peoples Champ

A daily "Who's better right now?" NBA game for friends. A user logs in, sees
today's five NBA players, answers ten head-to-head matchup questions, and gets:

- their implied ranking of those five players,
- a way to tag *why* they ranked them that way (stats, legacy, "that boy nice"),
- a score for how well they align with the crowd, and
- global leaderboards for players and users.

## Repository layout

| Path | What it is |
|------|------------|
| `backend/` | FastAPI app (`backend/app/`), SQLite db, deploy configs (Procfile, `railway.toml`, `render.yaml`) |
| `frontend/` | Web client |
| `scripts/` | Data pipeline: scrape Basketball-Reference, generate player rankings (v1–v3), build daily schedules, score game results |
| `data/` | Generated CSVs (rankings, schedules, results) |
| `templates/` | HTML templates |
| `docs/` | All project documentation (methodology, guides, version history) |

## Quick start (data pipeline)

```bash
python scripts/generate_player_rankings_v3.py   # ~5-10 min; writes data/player_rankings_24-25_v3.csv
python scripts/generate_daily_schedule.py       # build the daily matchup schedule
python scripts/calculate_game_results.py        # score completed games
```

The current ranking model is **V3** (one row per player, 3-year historical
features, 2x playoff weighting). See `docs/QUICK_START.md` and
`docs/RANKING_METHODOLOGY_V2.md` for details.

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
python seed_players_from_csv.py   # seed players from the rankings CSV
```

## Documentation

Everything that used to live in the repo root is now in [`docs/`](docs/):

- **Start here:** [`docs/QUICK_START.md`](docs/QUICK_START.md) · [`docs/QUICK_REFERENCE.md`](docs/QUICK_REFERENCE.md)
- **Ranking model:** [`docs/RANKING_METHODOLOGY.md`](docs/RANKING_METHODOLOGY.md) (v1) · [`docs/RANKING_METHODOLOGY_V2.md`](docs/RANKING_METHODOLOGY_V2.md) · [`docs/RANKING_SUMMARY.md`](docs/RANKING_SUMMARY.md)
- **Schedules & results:** [`docs/SCHEDULE_README.md`](docs/SCHEDULE_README.md) · [`docs/GAME_RESULTS_GUIDE.md`](docs/GAME_RESULTS_GUIDE.md)
- **History / changelog:** [`docs/VERSION_COMPARISON.md`](docs/VERSION_COMPARISON.md) · [`docs/RANKING_CHANGES_V2.md`](docs/RANKING_CHANGES_V2.md) · [`docs/RANKING_UPDATES.md`](docs/RANKING_UPDATES.md) · [`docs/README_V2.md`](docs/README_V2.md) · [`docs/README_V3.md`](docs/README_V3.md)
- **Architecture notes:** [`docs/ARCHITECTURE_CRITIQUE.md`](docs/ARCHITECTURE_CRITIQUE.md) · [`docs/IMPLEMENTATION_SUMMARY.md`](docs/IMPLEMENTATION_SUMMARY.md) · [`docs/ARCHIVE_INFO.md`](docs/ARCHIVE_INFO.md)
