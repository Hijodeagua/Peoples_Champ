"""
All-Time Rankings API endpoints.
Allows users to create and manage their all-time GOAT rankings.
"""
import json
import random
import secrets
import hashlib
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.session import get_db
from .. import models
from ..core.all_time_players import get_cached_all_time_players, get_all_time_players_dict


router = APIRouter()


# ============ Pydantic Schemas ============

class StartRankingRequest(BaseModel):
    ranking_size: int  # 10, 50, 100, or 0 for infinite
    player_pool: Optional[List[str]] = None  # Custom list of player IDs
    custom_list_code: Optional[str] = None  # Use existing custom list


class StartRankingResponse(BaseModel):
    ranking_id: int
    ranking_size: int
    total_matchups: Optional[int]
    first_matchup: "MatchupOut"


class StatWithRank(BaseModel):
    value: float
    rank: int  # All-time rank in this category
    percentile: float  # Percentile (0-100, higher is better)


class PlayerStats(BaseModel):
    games: StatWithRank
    points: StatWithRank
    rebounds: StatWithRank
    assists: StatWithRank
    steals: StatWithRank
    blocks: StatWithRank
    fg_pct: StatWithRank
    ts_pct: StatWithRank
    win_shares: StatWithRank
    career_from: str
    career_to: str


class MatchupOut(BaseModel):
    player1_id: str
    player1_name: str
    player1_team: Optional[str]
    player1_position: Optional[str]
    player1_stats: Optional[PlayerStats] = None
    player2_id: str
    player2_name: str
    player2_team: Optional[str]
    player2_position: Optional[str]
    player2_stats: Optional[PlayerStats] = None


class VoteRequest(BaseModel):
    winner_id: str


class VoteResponse(BaseModel):
    matchups_completed: int
    total_matchups: Optional[int]
    current_rankings: List["RankingEntry"]
    next_matchup: Optional[MatchupOut]
    is_complete: bool


class RankingEntry(BaseModel):
    rank: int
    player_id: str
    player_name: str
    team: Optional[str]
    position: Optional[str]
    score: float  # Elo score
    wins: int
    losses: int


class GetRankingResponse(BaseModel):
    ranking_id: int
    ranking_size: int
    is_complete: bool
    matchups_completed: int
    total_matchups: Optional[int]
    current_rankings: List[RankingEntry]
    share_slug: Optional[str]


class CompleteRankingRequest(BaseModel):
    generate_share_link: bool = True


class CompleteRankingResponse(BaseModel):
    final_rankings: List[RankingEntry]
    share_slug: Optional[str]
    share_url: Optional[str]


class CreateListRequest(BaseModel):
    name: str
    description: Optional[str] = None
    player_ids: List[str]
    is_public: bool = False


class CreateListResponse(BaseModel):
    list_id: int
    share_code: str
    name: str


class GetListResponse(BaseModel):
    list_id: int
    name: str
    description: Optional[str]
    player_ids: List[str]
    player_names: List[str]
    share_code: str


# ============ Helper Functions ============

def get_session_id(x_session_id: Optional[str] = Header(None)) -> Optional[str]:
    """Extract session ID from header for anonymous users."""
    return x_session_id


def generate_share_slug() -> str:
    """Generate a unique share slug."""
    return secrets.token_urlsafe(8)


def generate_share_code() -> str:
    """Generate a short share code for custom lists."""
    return secrets.token_urlsafe(6)


def compute_elo_update(winner_score: float, loser_score: float, k: float = 32) -> tuple:
    """
    Compute Elo rating updates after a matchup.
    Returns (new_winner_score, new_loser_score).
    """
    expected_winner = 1 / (1 + 10 ** ((loser_score - winner_score) / 400))
    expected_loser = 1 - expected_winner

    new_winner_score = winner_score + k * (1 - expected_winner)
    new_loser_score = loser_score + k * (0 - expected_loser)

    return new_winner_score, new_loser_score


def get_next_matchup(
    player_scores: dict,
    completed_pairs: set,
    ranking_size: int,
    matchups_completed: int
) -> Optional[tuple]:
    """
    Select the next most informative matchup using Elo uncertainty.
    Returns (player1_id, player2_id) or None if done.
    """
    players = list(player_scores.keys())
    n = len(players)

    # For finite rankings, we need n*(n-1)/2 matchups
    if ranking_size > 0:
        total_needed = (n * (n - 1)) // 2
        if len(completed_pairs) >= total_needed:
            return None

    # Find the pair with closest Elo scores that hasn't been compared
    best_pair = None
    best_diff = float('inf')

    for i in range(n):
        for j in range(i + 1, n):
            pair = frozenset({players[i], players[j]})
            if pair in completed_pairs:
                continue

            diff = abs(player_scores[players[i]]['score'] - player_scores[players[j]]['score'])
            if diff < best_diff:
                best_diff = diff
                best_pair = (players[i], players[j])

    return best_pair


def compute_stat_ranks() -> dict:
    """
    Compute all-time ranks for each stat category.
    Returns dict of {stat_name: [(player_id, value, rank, percentile), ...]}
    """
    all_players = get_cached_all_time_players()
    total = len(all_players)
    
    stat_ranks = {}
    
    # Define stats to rank (attr_name, higher_is_better)
    stats = [
        ('games', True),
        ('points', True),
        ('rebounds', True),
        ('assists', True),
        ('steals', True),
        ('blocks', True),
        ('fg_pct', True),
        ('ts_pct', True),
        ('career_ws', True),
    ]
    
    for stat_name, higher_is_better in stats:
        # Sort players by this stat
        sorted_players = sorted(
            all_players,
            key=lambda p: getattr(p, stat_name),
            reverse=higher_is_better
        )
        
        # Build rank lookup: player_id -> (value, rank, percentile)
        rank_lookup = {}
        for rank, player in enumerate(sorted_players, 1):
            value = getattr(player, stat_name)
            # Percentile: 100 = best, 0 = worst
            percentile = round((total - rank) / total * 100, 1)
            rank_lookup[player.id] = (value, rank, percentile)
        
        stat_ranks[stat_name] = rank_lookup
    
    return stat_ranks


# Cache stat ranks
_cached_stat_ranks: Optional[dict] = None


def get_cached_stat_ranks() -> dict:
    """Get cached stat ranks (computes once)."""
    global _cached_stat_ranks
    if _cached_stat_ranks is None:
        _cached_stat_ranks = compute_stat_ranks()
    return _cached_stat_ranks


def build_player_stats(player_id: str) -> Optional[PlayerStats]:
    """Build PlayerStats from all-time player data with ranks and percentiles."""
    all_time_dict = get_all_time_players_dict()
    player = all_time_dict.get(player_id)
    if not player:
        return None
    
    stat_ranks = get_cached_stat_ranks()
    
    def make_stat(stat_name: str) -> StatWithRank:
        value, rank, percentile = stat_ranks[stat_name].get(player_id, (0, 0, 0))
        return StatWithRank(value=value, rank=rank, percentile=percentile)
    
    return PlayerStats(
        games=make_stat('games'),
        points=make_stat('points'),
        rebounds=make_stat('rebounds'),
        assists=make_stat('assists'),
        steals=make_stat('steals'),
        blocks=make_stat('blocks'),
        fg_pct=make_stat('fg_pct'),
        ts_pct=make_stat('ts_pct'),
        win_shares=make_stat('career_ws'),
        career_from=player.career_from,
        career_to=player.career_to
    )


def compute_rankings_from_scores(player_scores: dict, db: Session) -> List[RankingEntry]:
    """Convert player scores dict to sorted ranking entries."""
    sorted_players = sorted(
        player_scores.items(),
        key=lambda x: x[1]['score'],
        reverse=True
    )

    # Get all-time players dict for lookups
    all_time_dict = get_all_time_players_dict()

    rankings = []
    for rank, (player_id, data) in enumerate(sorted_players, 1):
        # Look up from all-time data first, fall back to DB
        alltime_player = all_time_dict.get(player_id)
        if alltime_player:
            name, team, position = alltime_player.name, alltime_player.team, alltime_player.position
        else:
            player = db.query(models.Player).filter(models.Player.id == player_id).first()
            name = player.name if player else player_id
            team = player.team if player else None
            position = player.position if player else None
        
        rankings.append(RankingEntry(
            rank=rank,
            player_id=player_id,
            player_name=name,
            team=team,
            position=position,
            score=round(data['score'], 1),
            wins=data['wins'],
            losses=data['losses']
        ))

    return rankings


# ============ API Endpoints ============

@router.post("/start", response_model=StartRankingResponse)
async def start_ranking(
    request: StartRankingRequest,
    session_id: Optional[str] = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    """
    Start a new all-time ranking session.
    """
    if request.ranking_size not in [0, 10, 50, 100]:
        raise HTTPException(status_code=400, detail="ranking_size must be 0, 10, 50, or 100")

    # Determine player pool
    player_ids = []

    if request.custom_list_code:
        # Use existing custom list
        custom_list = db.query(models.CustomList).filter(
            models.CustomList.share_code == request.custom_list_code
        ).first()
        if not custom_list:
            raise HTTPException(status_code=404, detail="Custom list not found")
        player_ids = json.loads(custom_list.player_ids)
    elif request.player_pool:
        # Use provided player pool
        player_ids = request.player_pool
    else:
        # Use all-time players from CSV (career stats)
        all_time_players = get_cached_all_time_players()
        size = request.ranking_size if request.ranking_size > 0 else len(all_time_players)
        player_ids = [p.id for p in all_time_players[:size]]

    if len(player_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players to rank")

    # Get all-time players dict for lookups
    all_time_dict = get_all_time_players_dict()

    # Initialize player scores (Elo starting at 1500)
    player_scores = {
        pid: {"score": 1500.0, "wins": 0, "losses": 0}
        for pid in player_ids
    }

    # Calculate total matchups for finite mode
    n = len(player_ids)
    total_matchups = (n * (n - 1)) // 2 if request.ranking_size > 0 else None

    # Create ranking record
    ranking = models.AllTimeRanking(
        session_id=session_id,
        ranking_size=request.ranking_size,
        player_rankings=json.dumps(player_scores),
        player_pool=json.dumps(player_ids),
        is_complete=False,
        matchups_completed=0,
        total_matchups=total_matchups,
    )
    db.add(ranking)
    db.commit()
    db.refresh(ranking)

    # Get first matchup
    completed_pairs = set()
    next_pair = get_next_matchup(player_scores, completed_pairs, request.ranking_size, 0)

    if not next_pair:
        raise HTTPException(status_code=500, detail="Could not generate first matchup")

    # Look up players from all-time data first, fall back to DB
    p1_alltime = all_time_dict.get(next_pair[0])
    p2_alltime = all_time_dict.get(next_pair[1])
    
    if p1_alltime:
        p1_name, p1_team, p1_pos = p1_alltime.name, p1_alltime.team, p1_alltime.position
    else:
        player1 = db.query(models.Player).filter(models.Player.id == next_pair[0]).first()
        p1_name = player1.name if player1 else next_pair[0]
        p1_team = player1.team if player1 else None
        p1_pos = player1.position if player1 else None
    
    if p2_alltime:
        p2_name, p2_team, p2_pos = p2_alltime.name, p2_alltime.team, p2_alltime.position
    else:
        player2 = db.query(models.Player).filter(models.Player.id == next_pair[1]).first()
        p2_name = player2.name if player2 else next_pair[1]
        p2_team = player2.team if player2 else None
        p2_pos = player2.position if player2 else None

    first_matchup = MatchupOut(
        player1_id=next_pair[0],
        player1_name=p1_name,
        player1_team=p1_team,
        player1_position=p1_pos,
        player1_stats=build_player_stats(next_pair[0]),
        player2_id=next_pair[1],
        player2_name=p2_name,
        player2_team=p2_team,
        player2_position=p2_pos,
        player2_stats=build_player_stats(next_pair[1]),
    )

    return StartRankingResponse(
        ranking_id=ranking.id,
        ranking_size=request.ranking_size,
        total_matchups=total_matchups,
        first_matchup=first_matchup
    )


@router.put("/{ranking_id}/vote", response_model=VoteResponse)
async def submit_vote(
    ranking_id: int,
    request: VoteRequest,
    session_id: Optional[str] = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    """
    Submit a vote for a matchup in an all-time ranking session.
    """
    # Get the ranking
    ranking = db.query(models.AllTimeRanking).filter(
        models.AllTimeRanking.id == ranking_id
    ).first()

    if not ranking:
        raise HTTPException(status_code=404, detail="Ranking session not found")

    if ranking.session_id and ranking.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized to vote on this ranking")

    if ranking.is_complete:
        raise HTTPException(status_code=400, detail="Ranking is already complete")

    # Get current state
    player_scores = json.loads(ranking.player_rankings)
    player_pool = json.loads(ranking.player_pool) if ranking.player_pool else list(player_scores.keys())

    # Get completed pairs from existing votes
    existing_votes = db.query(models.AllTimeMatchupVote).filter(
        models.AllTimeMatchupVote.ranking_id == ranking_id
    ).all()
    completed_pairs = {
        frozenset({v.player1_id, v.player2_id})
        for v in existing_votes
    }

    # Determine current matchup (last generated)
    current_pair = get_next_matchup(player_scores, completed_pairs, ranking.ranking_size, ranking.matchups_completed)

    if not current_pair:
        raise HTTPException(status_code=400, detail="No pending matchup")

    if request.winner_id not in current_pair:
        raise HTTPException(status_code=400, detail="Winner not in current matchup")

    loser_id = current_pair[0] if current_pair[1] == request.winner_id else current_pair[1]

    # Record the vote
    vote = models.AllTimeMatchupVote(
        ranking_id=ranking_id,
        player1_id=current_pair[0],
        player2_id=current_pair[1],
        winner_id=request.winner_id
    )
    db.add(vote)

    # Update Elo scores
    winner_score = player_scores[request.winner_id]['score']
    loser_score = player_scores[loser_id]['score']
    new_winner, new_loser = compute_elo_update(winner_score, loser_score)

    player_scores[request.winner_id]['score'] = new_winner
    player_scores[request.winner_id]['wins'] += 1
    player_scores[loser_id]['score'] = new_loser
    player_scores[loser_id]['losses'] += 1

    # Update ranking
    ranking.player_rankings = json.dumps(player_scores)
    ranking.matchups_completed += 1

    # Check if complete
    completed_pairs.add(frozenset(current_pair))
    next_pair = get_next_matchup(player_scores, completed_pairs, ranking.ranking_size, ranking.matchups_completed)

    is_complete = next_pair is None
    if is_complete:
        ranking.is_complete = True
        ranking.share_slug = generate_share_slug()

    db.commit()

    # Build response
    current_rankings = compute_rankings_from_scores(player_scores, db)

    next_matchup = None
    if next_pair:
        # Look up players from all-time data first, fall back to DB
        all_time_dict = get_all_time_players_dict()
        p1_alltime = all_time_dict.get(next_pair[0])
        p2_alltime = all_time_dict.get(next_pair[1])
        
        if p1_alltime:
            p1_name, p1_team, p1_pos = p1_alltime.name, p1_alltime.team, p1_alltime.position
        else:
            p1 = db.query(models.Player).filter(models.Player.id == next_pair[0]).first()
            p1_name = p1.name if p1 else next_pair[0]
            p1_team = p1.team if p1 else None
            p1_pos = p1.position if p1 else None
        
        if p2_alltime:
            p2_name, p2_team, p2_pos = p2_alltime.name, p2_alltime.team, p2_alltime.position
        else:
            p2 = db.query(models.Player).filter(models.Player.id == next_pair[1]).first()
            p2_name = p2.name if p2 else next_pair[1]
            p2_team = p2.team if p2 else None
            p2_pos = p2.position if p2 else None
        
        next_matchup = MatchupOut(
            player1_id=next_pair[0],
            player1_name=p1_name,
            player1_team=p1_team,
            player1_position=p1_pos,
            player1_stats=build_player_stats(next_pair[0]),
            player2_id=next_pair[1],
            player2_name=p2_name,
            player2_team=p2_team,
            player2_position=p2_pos,
            player2_stats=build_player_stats(next_pair[1]),
        )

    return VoteResponse(
        matchups_completed=ranking.matchups_completed,
        total_matchups=ranking.total_matchups,
        current_rankings=current_rankings,
        next_matchup=next_matchup,
        is_complete=is_complete
    )


@router.get("/{ranking_id}", response_model=GetRankingResponse)
async def get_ranking(
    ranking_id: int,
    session_id: Optional[str] = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    """
    Get the current state of an all-time ranking session.
    """
    ranking = db.query(models.AllTimeRanking).filter(
        models.AllTimeRanking.id == ranking_id
    ).first()

    if not ranking:
        raise HTTPException(status_code=404, detail="Ranking session not found")

    player_scores = json.loads(ranking.player_rankings)
    current_rankings = compute_rankings_from_scores(player_scores, db)

    return GetRankingResponse(
        ranking_id=ranking.id,
        ranking_size=ranking.ranking_size,
        is_complete=ranking.is_complete,
        matchups_completed=ranking.matchups_completed,
        total_matchups=ranking.total_matchups,
        current_rankings=current_rankings,
        share_slug=ranking.share_slug
    )


@router.post("/{ranking_id}/complete", response_model=CompleteRankingResponse)
async def complete_ranking(
    ranking_id: int,
    request: CompleteRankingRequest,
    session_id: Optional[str] = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    """
    Mark a ranking session as complete and get final results.
    Can be called early to get partial rankings.
    """
    ranking = db.query(models.AllTimeRanking).filter(
        models.AllTimeRanking.id == ranking_id
    ).first()

    if not ranking:
        raise HTTPException(status_code=404, detail="Ranking session not found")

    if ranking.session_id and ranking.session_id != session_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Mark as complete
    ranking.is_complete = True

    # Generate share link if requested
    share_slug = None
    share_url = None
    if request.generate_share_link and not ranking.share_slug:
        ranking.share_slug = generate_share_slug()

    if ranking.share_slug:
        share_slug = ranking.share_slug
        share_url = f"https://whosyurgoat.app/share/alltime/{share_slug}"

    db.commit()

    player_scores = json.loads(ranking.player_rankings)
    final_rankings = compute_rankings_from_scores(player_scores, db)

    return CompleteRankingResponse(
        final_rankings=final_rankings,
        share_slug=share_slug,
        share_url=share_url
    )


@router.get("/share/{share_slug}", response_model=GetRankingResponse)
async def get_shared_ranking(
    share_slug: str,
    db: Session = Depends(get_db)
):
    """
    Get a shared all-time ranking by its share slug.
    """
    ranking = db.query(models.AllTimeRanking).filter(
        models.AllTimeRanking.share_slug == share_slug
    ).first()

    if not ranking:
        raise HTTPException(status_code=404, detail="Shared ranking not found")

    player_scores = json.loads(ranking.player_rankings)
    current_rankings = compute_rankings_from_scores(player_scores, db)

    return GetRankingResponse(
        ranking_id=ranking.id,
        ranking_size=ranking.ranking_size,
        is_complete=ranking.is_complete,
        matchups_completed=ranking.matchups_completed,
        total_matchups=ranking.total_matchups,
        current_rankings=current_rankings,
        share_slug=ranking.share_slug
    )


# ============ Custom Lists Endpoints ============

@router.post("/lists/create", response_model=CreateListResponse)
async def create_custom_list(
    request: CreateListRequest,
    session_id: Optional[str] = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    """
    Create a custom list of players for ranking.
    """
    if len(request.player_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players")

    if len(request.player_ids) > 200:
        raise HTTPException(status_code=400, detail="Maximum 200 players allowed")

    # Validate player IDs exist
    valid_players = db.query(models.Player.id).filter(
        models.Player.id.in_(request.player_ids)
    ).all()
    valid_ids = {p.id for p in valid_players}

    invalid_ids = set(request.player_ids) - valid_ids
    if invalid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid player IDs: {', '.join(list(invalid_ids)[:5])}"
        )

    custom_list = models.CustomList(
        session_id=session_id,
        name=request.name,
        description=request.description,
        player_ids=json.dumps(request.player_ids),
        share_code=generate_share_code(),
        is_public=request.is_public
    )
    db.add(custom_list)
    db.commit()
    db.refresh(custom_list)

    return CreateListResponse(
        list_id=custom_list.id,
        share_code=custom_list.share_code,
        name=custom_list.name
    )


@router.get("/lists/{share_code}", response_model=GetListResponse)
async def get_custom_list(
    share_code: str,
    db: Session = Depends(get_db)
):
    """
    Get a custom list by its share code.
    """
    custom_list = db.query(models.CustomList).filter(
        models.CustomList.share_code == share_code
    ).first()

    if not custom_list:
        raise HTTPException(status_code=404, detail="List not found")

    player_ids = json.loads(custom_list.player_ids)

    # Get player names
    players = db.query(models.Player).filter(
        models.Player.id.in_(player_ids)
    ).all()
    id_to_name = {p.id: p.name for p in players}
    player_names = [id_to_name.get(pid, pid) for pid in player_ids]

    return GetListResponse(
        list_id=custom_list.id,
        name=custom_list.name,
        description=custom_list.description,
        player_ids=player_ids,
        player_names=player_names,
        share_code=custom_list.share_code
    )
