import json
import random
from datetime import date
from functools import cmp_to_key
from itertools import combinations
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db.session import get_db
from .. import models
from ..services.stats_loader import get_stats_with_percentiles, get_top_stats_for_position, get_advanced_stats_with_percentiles


router = APIRouter(prefix="/game", tags=["game"])


class PlayerStats(BaseModel):
    # Core per-game stats
    pts: Optional[float] = None
    reb: Optional[float] = None
    ast: Optional[float] = None
    stl: Optional[float] = None
    blk: Optional[float] = None
    # Shooting percentages
    three_pct: Optional[float] = None
    ft_pct: Optional[float] = None
    efg_pct: Optional[float] = None
    # Other
    tov: Optional[float] = None
    mpg: Optional[float] = None
    games: Optional[int] = None
    pos_count: Optional[int] = None  # Total players at this position
    # Percentiles (0-100) for league-wide comparison
    pts_pctl: Optional[float] = None
    reb_pctl: Optional[float] = None
    ast_pctl: Optional[float] = None
    stl_pctl: Optional[float] = None
    blk_pctl: Optional[float] = None
    three_pctl: Optional[float] = None
    ft_pctl: Optional[float] = None
    efg_pctl: Optional[float] = None
    tov_pctl: Optional[float] = None
    # Position ranks (1 = best at position)
    pts_pos_rank: Optional[int] = None
    reb_pos_rank: Optional[int] = None
    ast_pos_rank: Optional[int] = None
    stl_pos_rank: Optional[int] = None
    blk_pos_rank: Optional[int] = None
    three_pos_rank: Optional[int] = None
    ft_pos_rank: Optional[int] = None
    efg_pos_rank: Optional[int] = None
    tov_pos_rank: Optional[int] = None
    # Position-based top stats (list of stat names to highlight)
    top_stats: Optional[List[str]] = None


class AdvancedStats(BaseModel):
    """Advanced stats from BBRef (PER, WS, BPM, VORP, etc.)"""
    per: Optional[float] = None           # Player Efficiency Rating
    ts_pct: Optional[float] = None        # True Shooting %
    usg_pct: Optional[float] = None       # Usage %
    ws: Optional[float] = None            # Win Shares
    ws_48: Optional[float] = None         # Win Shares per 48
    ows: Optional[float] = None           # Offensive Win Shares
    dws: Optional[float] = None           # Defensive Win Shares
    obpm: Optional[float] = None          # Offensive Box Plus/Minus
    dbpm: Optional[float] = None          # Defensive Box Plus/Minus
    bpm: Optional[float] = None           # Box Plus/Minus
    vorp: Optional[float] = None          # Value Over Replacement Player
    tov_pct: Optional[float] = None       # Turnover %
    games: Optional[int] = None
    minutes: Optional[int] = None
    # Percentiles
    per_pctl: Optional[float] = None
    ts_pctl: Optional[float] = None
    ws_pctl: Optional[float] = None
    ws_48_pctl: Optional[float] = None
    bpm_pctl: Optional[float] = None
    vorp_pctl: Optional[float] = None
    usg_pctl: Optional[float] = None
    obpm_pctl: Optional[float] = None
    dbpm_pctl: Optional[float] = None
    tov_pct_pctl: Optional[float] = None


class PlayerOut(BaseModel):
    id: str
    name: str
    team: Optional[str]
    position: Optional[str] = None
    stats: Optional[PlayerStats] = None
    advanced: Optional[AdvancedStats] = None  # Advanced stats (PER, WS, BPM, VORP)
    season: Optional[str] = None  # "current" or "combined"


class MatchupOut(BaseModel):
    id: int
    player_a_id: str
    player_b_id: str
    order_index: int


class GameTodayResponse(BaseModel):
    daily_set_id: int
    date: date
    mode_options: List[str]
    season_options: List[str]  # ["current", "combined"]
    current_season: str  # Which season stats are being shown
    players: List[PlayerOut]
    matchups: List[MatchupOut]


class AnswerIn(BaseModel):
    matchup_id: int
    winner_id: str


class GameSubmitRequest(BaseModel):
    daily_set_id: int
    mode: str
    answers: List[AnswerIn]


class RankingEntry(BaseModel):
    id: str
    name: str
    team: Optional[str]
    position: int


class ScoreOut(BaseModel):
    mode: str
    points: Optional[int]
    max_points: Optional[int]
    explanation: Optional[str]


class CrowdAlignment(BaseModel):
    similarity_percentile: Optional[float]
    note: Optional[str]


class GameSubmitResponse(BaseModel):
    submission_id: int
    share_slug: str
    final_ranking: List[RankingEntry]
    score: ScoreOut
    crowd_alignment: CrowdAlignment


class SharedResultResponse(BaseModel):
    date: date
    mode: str
    final_ranking: List[RankingEntry]
    score_summary: Optional[str]


class ArchiveEntry(BaseModel):
    date: date
    players: List[PlayerOut]
    total_votes: int
    is_completed: bool


class ArchiveResponse(BaseModel):
    archives: List[ArchiveEntry]
    total_days: int


def int_to_base36(number: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if number == 0:
        return "0"
    result = ""
    while number:
        number, rem = divmod(number, 36)
        result = chars[rem] + result
    return result


def build_player_stats(player_id: str, position: str, season: str = "current") -> Optional[PlayerStats]:
    """Build PlayerStats from CSV data with percentiles and position ranks"""
    stats_data = get_stats_with_percentiles(player_id, season)
    
    if not stats_data:
        return None
    
    # Get top stats for this position
    top_stats = get_top_stats_for_position(position or stats_data.get("position", ""))
    
    return PlayerStats(
        pts=stats_data.get("pts"),
        reb=stats_data.get("reb"),
        ast=stats_data.get("ast"),
        stl=stats_data.get("stl"),
        blk=stats_data.get("blk"),
        three_pct=stats_data.get("three_pct"),
        ft_pct=stats_data.get("ft_pct"),
        efg_pct=stats_data.get("efg_pct"),
        tov=stats_data.get("tov"),
        mpg=stats_data.get("mpg"),
        games=stats_data.get("games"),
        pos_count=stats_data.get("pos_count"),
        # Percentiles
        pts_pctl=stats_data.get("pts_pctl"),
        reb_pctl=stats_data.get("reb_pctl"),
        ast_pctl=stats_data.get("ast_pctl"),
        stl_pctl=stats_data.get("stl_pctl"),
        blk_pctl=stats_data.get("blk_pctl"),
        three_pctl=stats_data.get("three_pctl"),
        ft_pctl=stats_data.get("ft_pctl"),
        efg_pctl=stats_data.get("efg_pctl"),
        tov_pctl=stats_data.get("tov_pctl"),
        # Position ranks
        pts_pos_rank=stats_data.get("pts_pos_rank"),
        reb_pos_rank=stats_data.get("reb_pos_rank"),
        ast_pos_rank=stats_data.get("ast_pos_rank"),
        stl_pos_rank=stats_data.get("stl_pos_rank"),
        blk_pos_rank=stats_data.get("blk_pos_rank"),
        three_pos_rank=stats_data.get("three_pos_rank"),
        ft_pos_rank=stats_data.get("ft_pos_rank"),
        efg_pos_rank=stats_data.get("efg_pos_rank"),
        tov_pos_rank=stats_data.get("tov_pos_rank"),
        top_stats=top_stats,
    )


def build_advanced_stats(player_id: str, season: str = "current") -> Optional[AdvancedStats]:
    """Build AdvancedStats from BBRef Advanced CSV data with percentiles"""
    adv_data = get_advanced_stats_with_percentiles(player_id, season)
    
    if not adv_data:
        return None
    
    return AdvancedStats(
        per=adv_data.get("per"),
        ts_pct=adv_data.get("ts_pct"),
        usg_pct=adv_data.get("usg_pct"),
        ws=adv_data.get("ws"),
        ws_48=adv_data.get("ws_48"),
        ows=adv_data.get("ows"),
        dws=adv_data.get("dws"),
        obpm=adv_data.get("obpm"),
        dbpm=adv_data.get("dbpm"),
        bpm=adv_data.get("bpm"),
        vorp=adv_data.get("vorp"),
        tov_pct=adv_data.get("tov_pct"),
        games=adv_data.get("games"),
        minutes=adv_data.get("minutes"),
        per_pctl=adv_data.get("per_pctl"),
        ts_pctl=adv_data.get("ts_pctl"),
        ws_pctl=adv_data.get("ws_pctl"),
        ws_48_pctl=adv_data.get("ws_48_pctl"),
        bpm_pctl=adv_data.get("bpm_pctl"),
        vorp_pctl=adv_data.get("vorp_pctl"),
        usg_pctl=adv_data.get("usg_pctl"),
        obpm_pctl=adv_data.get("obpm_pctl"),
        dbpm_pctl=adv_data.get("dbpm_pctl"),
        tov_pct_pctl=adv_data.get("tov_pct_pctl"),
    )


def compute_final_ranking(
    players: List[models.Player],
    matchups: List[models.Matchup],
    answers: List[AnswerIn],
) -> List[str]:
    win_counts: Dict[str, int] = {player.id: 0 for player in players}
    matchup_map: Dict[int, models.Matchup] = {m.id: m for m in matchups}
    head_to_head: Dict[frozenset, str] = {}

    for answer in answers:
        matchup = matchup_map.get(answer.matchup_id)
        if not matchup:
            raise HTTPException(status_code=400, detail="Matchup not part of the daily set")
        if answer.winner_id not in {matchup.player1_id, matchup.player2_id}:
            raise HTTPException(status_code=400, detail="Winner not in matchup")
        win_counts[answer.winner_id] = win_counts.get(answer.winner_id, 0) + 1
        head_to_head[frozenset({matchup.player1_id, matchup.player2_id})] = answer.winner_id

    player_ids = [p.id for p in players]

    def compare(a_id: str, b_id: str) -> int:
        wins_a = win_counts.get(a_id, 0)
        wins_b = win_counts.get(b_id, 0)
        if wins_a != wins_b:
            return -1 if wins_a > wins_b else 1
        head_key = frozenset({a_id, b_id})
        if head_key in head_to_head:
            winner = head_to_head[head_key]
            if winner == a_id:
                return -1
            if winner == b_id:
                return 1
        return -1 if a_id < b_id else 1 if a_id > b_id else 0

    return sorted(player_ids, key=cmp_to_key(compare))


@router.get("/debug/schedule")
def debug_schedule(db: Session = Depends(get_db)):
    """Debug endpoint to check schedule status"""
    from datetime import datetime
    
    try:
        utc_now = datetime.utcnow()
        today_utc = date.today()
        
        # Get recent daily sets
        recent_sets = db.query(models.DailySet).order_by(models.DailySet.date.desc()).limit(5).all()
        
        sets_info = []
        for ds in recent_sets:
            sets_info.append({
                "id": ds.id, 
                "date": str(ds.date),
                "player_count": len(ds.players) if ds.players else 0,
                "matchup_count": len(ds.matchups) if ds.matchups else 0
            })
        
        return {
            "server_utc_now": str(utc_now),
            "server_date_today": str(today_utc),
            "recent_daily_sets": sets_info
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/today", response_model=GameTodayResponse)
def get_today(db: Session = Depends(get_db), season: str = "current"):
    """Get today's game with player stats. Season can be 'current' (25-26) or 'combined' (24-25 + 25-26)"""
    if season not in ["current", "combined"]:
        season = "current"
    today = date.today()
    print(f"[/game/today] Server date.today() = {today}")
    
    daily_set = db.query(models.DailySet).filter(models.DailySet.date == today).first()
    print(f"[/game/today] Found existing daily_set: {daily_set is not None}")

    if not daily_set:
        print(f"[/game/today] No daily set for {today}, creating new one...")
        # Select exactly 5 players for the daily set
        player_count = db.query(models.Player).count()
        print(f"[/game/today] Total players in DB: {player_count}")
        
        players = (
            db.query(models.Player)
            .order_by(func.random())
            .limit(5)
            .all()
        )
        print(f"[/game/today] Selected {len(players)} random players")
        
        if len(players) < 5:
            raise HTTPException(status_code=400, detail=f"Not enough players to build daily set. Found {len(players)}, need 5.")

        try:
            daily_set = models.DailySet(date=today)
            db.add(daily_set)
            db.flush()
            print(f"[/game/today] Created daily_set with id={daily_set.id}")

            # Add all 5 players to the daily set
            for player in players:
                db.add(
                    models.DailySetPlayer(
                        daily_set_id=daily_set.id,
                        player_id=player.id,
                    )
                )

            # Create all possible matchups between the 5 players (C(5,2) = 10 matchups)
            for idx, (p1, p2) in enumerate(combinations(players, 2)):
                db.add(
                    models.Matchup(
                        daily_set_id=daily_set.id,
                        player1_id=p1.id,
                        player2_id=p2.id,
                        order_index=idx,
                    )
                )

            # No true ranking needed for individual matchup voting
            daily_set.true_ranking = None

            db.commit()
            db.refresh(daily_set)
            print(f"[/game/today] Successfully created daily set with {len(daily_set.matchups)} matchups")
        except Exception as e:
            print(f"[/game/today] ERROR creating daily set: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create daily set: {str(e)}")

    players = [dsp.player for dsp in daily_set.players]
    matchups = sorted(daily_set.matchups, key=lambda m: m.order_index or 0)

    return GameTodayResponse(
        daily_set_id=daily_set.id,
        date=daily_set.date,
        mode_options=["GUESS", "OWN"],
        season_options=["current", "combined"],
        current_season=season,
        players=[
            PlayerOut(
                id=p.id, 
                name=p.name, 
                team=p.team,
                position=p.position,
                stats=build_player_stats(p.id, p.position, season),
                advanced=build_advanced_stats(p.id, season),
                season=season,
            ) 
            for p in players
        ],
        matchups=[
            MatchupOut(
                id=m.id,
                player_a_id=m.player1_id,
                player_b_id=m.player2_id,
                order_index=m.order_index or 0,
            )
            for m in matchups
        ],
    )


@router.post("/submit", response_model=GameSubmitResponse)
def submit_game(request: GameSubmitRequest, db: Session = Depends(get_db)):
    daily_set = db.query(models.DailySet).filter(models.DailySet.id == request.daily_set_id).first()
    if not daily_set:
        raise HTTPException(status_code=404, detail="Daily set not found")
    if daily_set.date != date.today():
        raise HTTPException(status_code=400, detail="Submission must be for today's game")

    if len(request.answers) != len(daily_set.matchups):
        raise HTTPException(status_code=400, detail=f"Must answer all {len(daily_set.matchups)} matchups")
    matchup_ids = [a.matchup_id for a in request.answers]
    if len(set(matchup_ids)) != len(matchup_ids):
        raise HTTPException(status_code=400, detail="Duplicate matchup answers")

    matchup_map = {m.id: m for m in daily_set.matchups}
    if set(matchup_ids) != set(matchup_map.keys()):
        raise HTTPException(status_code=400, detail="Answers do not match required matchups")

    players = [dsp.player for dsp in daily_set.players]
    final_ranking_ids = compute_final_ranking(players, list(matchup_map.values()), request.answers)
    player_lookup = {p.id: p for p in players}

    if request.mode not in {"GUESS", "OWN"}:
        raise HTTPException(status_code=400, detail="Invalid mode")

    true_ranking = json.loads(daily_set.true_ranking) if daily_set.true_ranking else []
    max_points = 100 if request.mode == "GUESS" else None
    points = None
    explanation = None

    if request.mode == "GUESS" and true_ranking:
        points = 0
        for idx, player_id in enumerate(final_ranking_ids):
            if idx < len(true_ranking) and player_id == true_ranking[idx]:
                points += 20
        explanation = f"Matched {points // 20} of 5 positions."

    submission = models.Submission(
        daily_set_id=daily_set.id,
        mode=request.mode,
        answers=json.dumps([a.dict() for a in request.answers]),
        final_ranking=json.dumps(final_ranking_ids),
        score=points,
        share_slug="",
    )
    db.add(submission)
    db.flush()

    submission.share_slug = f"{daily_set.date.strftime('%y%m%d')}{int_to_base36(submission.id)}"
    db.commit()
    db.refresh(submission)

    final_ranking_entries = [
        RankingEntry(
            id=pid,
            name=player_lookup[pid].name if pid in player_lookup else pid,
            team=player_lookup[pid].team if pid in player_lookup else None,
            position=index + 1,
        )
        for index, pid in enumerate(final_ranking_ids)
    ]

    return GameSubmitResponse(
        submission_id=submission.id,
        share_slug=submission.share_slug,
        final_ranking=final_ranking_entries,
        score=ScoreOut(
            mode=request.mode,
            points=points,
            max_points=max_points,
            explanation=explanation,
        ),
        crowd_alignment=CrowdAlignment(similarity_percentile=None, note=None),
    )


@router.get("/share/{share_slug}", response_model=SharedResultResponse)
def get_shared_result(share_slug: str, db: Session = Depends(get_db)):
    submission = db.query(models.Submission).filter(models.Submission.share_slug == share_slug).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Shared result not found")

    daily_set = db.query(models.DailySet).filter(models.DailySet.id == submission.daily_set_id).first()
    player_ids = json.loads(submission.final_ranking)
    players = db.query(models.Player).filter(models.Player.id.in_(player_ids)).all()
    player_lookup = {p.id: p for p in players}

    final_ranking_entries = [
        RankingEntry(
            id=pid,
            name=player_lookup[pid].name if pid in player_lookup else pid,
            team=player_lookup[pid].team if pid in player_lookup else None,
            position=index + 1,
        )
        for index, pid in enumerate(player_ids)
    ]

    score_summary = None
    if submission.mode == "GUESS" and submission.score is not None:
        score_summary = f"{submission.score} / 100 in Guess the Rankings"
    elif submission.mode == "OWN":
        score_summary = "Custom People’s Champ ranking"

    return SharedResultResponse(
        date=daily_set.date if daily_set else date.today(),
        mode=submission.mode,
        final_ranking=final_ranking_entries,
        score_summary=score_summary,
    )


@router.get("/day/{target_date}", response_model=GameTodayResponse)
def get_day(target_date: str, db: Session = Depends(get_db), season: str = "current"):
    """Get a specific day's game for replay. Only allows access to past 7 days."""
    from datetime import datetime, timedelta
    
    if season not in ["current", "combined"]:
        season = "current"
    
    try:
        game_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    
    # Only allow access to past 7 days (vault access)
    if game_date > today:
        raise HTTPException(status_code=400, detail="Cannot access future games")
    if game_date < seven_days_ago:
        raise HTTPException(status_code=403, detail="Vault access limited to past 7 days")
    
    daily_set = db.query(models.DailySet).filter(models.DailySet.date == game_date).first()
    
    if not daily_set:
        raise HTTPException(status_code=404, detail=f"No game found for {target_date}")
    
    players = [dsp.player for dsp in daily_set.players]
    matchups = sorted(daily_set.matchups, key=lambda m: m.order_index or 0)
    
    return GameTodayResponse(
        daily_set_id=daily_set.id,
        date=daily_set.date,
        mode_options=["GUESS", "OWN"],
        season_options=["current", "combined"],
        current_season=season,
        players=[
            PlayerOut(
                id=p.id, 
                name=p.name, 
                team=p.team,
                position=p.position,
                stats=build_player_stats(p.id, p.position, season),
                advanced=build_advanced_stats(p.id, season),
                season=season,
            ) 
            for p in players
        ],
        matchups=[
            MatchupOut(
                id=m.id,
                player_a_id=m.player1_id,
                player_b_id=m.player2_id,
                order_index=m.order_index or 0,
            )
            for m in matchups
        ],
    )


@router.get("/archive", response_model=ArchiveResponse)
def get_archive(db: Session = Depends(get_db)):
    """Get archive of past daily sets (limited to 7 days for vault access)"""
    from datetime import timedelta
    
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    
    # Only show past 7 days for vault access
    daily_sets = db.query(models.DailySet).filter(
        models.DailySet.date >= seven_days_ago,
        models.DailySet.date <= today
    ).order_by(models.DailySet.date.desc()).all()
    
    archives = []
    for daily_set in daily_sets:
        # Count total votes for this daily set
        total_votes = db.query(models.UserChoice).join(models.Matchup).filter(
            models.Matchup.daily_set_id == daily_set.id
        ).count()
        
        # Check if voting is completed (arbitrary threshold)
        is_completed = total_votes > 0 or daily_set.date < date.today()
        
        archives.append(ArchiveEntry(
            date=daily_set.date,
            players=[PlayerOut(id=dsp.player.id, name=dsp.player.name, team=dsp.player.team) 
                    for dsp in daily_set.players],
            total_votes=total_votes,
            is_completed=is_completed
        ))
    
    return ArchiveResponse(
        archives=archives,
        total_days=len(archives)
    )
