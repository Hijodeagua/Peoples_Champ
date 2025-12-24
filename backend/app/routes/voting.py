from datetime import date
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.session import get_db
from .. import models

router = APIRouter(prefix="/voting", tags=["voting"])


class VoteRequest(BaseModel):
    matchup_id: int
    winner_player_id: str
    session_id: Optional[str] = None  # For anonymous users


class VoteResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[str] = None


class UserVotesResponse(BaseModel):
    votes_today: int
    total_matchups: int
    completed: bool


class PlayerRanking(BaseModel):
    id: str
    name: str
    team: str | None
    position: str | None
    wins: int
    total_matchups: int
    win_percentage: float
    total_votes_received: int


class GlobalRankingsResponse(BaseModel):
    date: date
    rankings: list[PlayerRanking]
    total_voters: int
    total_votes: int


def get_or_create_session_id(request: Request, response: Response) -> str:
    """Get session ID from cookie or create new one for anonymous users"""
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid4())
        response.set_cookie("session_id", session_id, max_age=86400 * 30)  # 30 days
    return session_id


@router.post("/vote", response_model=VoteResponse)
def submit_vote(
    vote: VoteRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Submit a vote for a matchup. Works for both authenticated and anonymous users."""
    
    # Get today's daily set
    today = date.today()
    daily_set = db.query(models.DailySet).filter(models.DailySet.date == today).first()
    if not daily_set:
        raise HTTPException(status_code=404, detail="No daily set available")
    
    # Validate matchup exists and is part of today's set
    matchup = db.query(models.Matchup).filter(
        models.Matchup.id == vote.matchup_id,
        models.Matchup.daily_set_id == daily_set.id
    ).first()
    if not matchup:
        raise HTTPException(status_code=404, detail="Matchup not found")
    
    # Validate winner is part of the matchup
    if vote.winner_player_id not in {matchup.player1_id, matchup.player2_id}:
        raise HTTPException(status_code=400, detail="Winner must be one of the matchup players")
    
    # Handle session for anonymous users
    session_id = vote.session_id or get_or_create_session_id(request, response)
    
    # Check if vote already exists for this session/matchup
    existing_vote = db.query(models.UserChoice).filter(
        models.UserChoice.matchup_id == vote.matchup_id,
        models.UserChoice.session_id == session_id
    ).first()
    
    if existing_vote:
        # Update existing vote
        existing_vote.winner_player_id = vote.winner_player_id
        db.commit()
        message = "Vote updated successfully"
    else:
        # Create new vote
        new_vote = models.UserChoice(
            user_id=None,  # Anonymous for now
            session_id=session_id,
            matchup_id=vote.matchup_id,
            winner_player_id=vote.winner_player_id
        )
        db.add(new_vote)
        db.commit()
        message = "Vote submitted successfully"
    
    return VoteResponse(
        success=True,
        message=message,
        session_id=session_id
    )


class UserVotesDetailResponse(BaseModel):
    votes_today: int
    total_matchups: int
    completed: bool
    votes: dict[int, str]  # matchup_id -> winner_player_id


@router.get("/status", response_model=UserVotesResponse)
def get_voting_status(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Get current user's voting status for today"""
    
    # Get today's daily set
    today = date.today()
    daily_set = db.query(models.DailySet).filter(models.DailySet.date == today).first()
    if not daily_set:
        return UserVotesResponse(votes_today=0, total_matchups=0, completed=False)
    
    session_id = get_or_create_session_id(request, response)
    
    # Count votes for this session today
    votes_today = db.query(models.UserChoice).join(models.Matchup).filter(
        models.UserChoice.session_id == session_id,
        models.Matchup.daily_set_id == daily_set.id
    ).count()
    
    total_matchups = len(daily_set.matchups)
    
    return UserVotesResponse(
        votes_today=votes_today,
        total_matchups=total_matchups,
        completed=votes_today >= total_matchups
    )


@router.get("/my-votes", response_model=UserVotesDetailResponse)
def get_my_votes(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Get current user's votes for today with details"""
    
    today = date.today()
    daily_set = db.query(models.DailySet).filter(models.DailySet.date == today).first()
    if not daily_set:
        return UserVotesDetailResponse(votes_today=0, total_matchups=0, completed=False, votes={})
    
    session_id = get_or_create_session_id(request, response)
    
    user_votes = db.query(models.UserChoice).join(models.Matchup).filter(
        models.UserChoice.session_id == session_id,
        models.Matchup.daily_set_id == daily_set.id
    ).all()
    
    votes_dict = {vote.matchup_id: vote.winner_player_id for vote in user_votes}
    total_matchups = len(daily_set.matchups)
    
    return UserVotesDetailResponse(
        votes_today=len(user_votes),
        total_matchups=total_matchups,
        completed=len(user_votes) >= total_matchups,
        votes=votes_dict
    )


@router.get("/aggregate/{matchup_id}")
def get_matchup_results(matchup_id: int, db: Session = Depends(get_db)):
    """Get aggregate voting results for a specific matchup"""
    
    matchup = db.query(models.Matchup).filter(models.Matchup.id == matchup_id).first()
    if not matchup:
        raise HTTPException(status_code=404, detail="Matchup not found")
    
    # Count votes for each player
    votes = db.query(models.UserChoice).filter(models.UserChoice.matchup_id == matchup_id).all()
    
    player1_votes = sum(1 for vote in votes if vote.winner_player_id == matchup.player1_id)
    player2_votes = sum(1 for vote in votes if vote.winner_player_id == matchup.player2_id)
    total_votes = len(votes)
    
    return {
        "matchup_id": matchup_id,
        "player1": {
            "id": matchup.player1_id,
            "name": matchup.player1.name,
            "votes": player1_votes,
            "percentage": round(player1_votes / total_votes * 100, 1) if total_votes > 0 else 0
        },
        "player2": {
            "id": matchup.player2_id,
            "name": matchup.player2.name,
            "votes": player2_votes,
            "percentage": round(player2_votes / total_votes * 100, 1) if total_votes > 0 else 0
        },
        "total_votes": total_votes
    }


@router.get("/global-rankings", response_model=GlobalRankingsResponse)
def get_global_rankings(db: Session = Depends(get_db)):
    """
    Get today's global rankings based on all votes.
    Rankings are calculated by counting wins across all matchups.
    """
    today = date.today()
    daily_set = db.query(models.DailySet).filter(models.DailySet.date == today).first()
    
    if not daily_set:
        return GlobalRankingsResponse(
            date=today,
            rankings=[],
            total_voters=0,
            total_votes=0
        )
    
    # Get all players in today's set
    players = {dsp.player.id: dsp.player for dsp in daily_set.players}
    
    # Get all matchups for today
    matchups = daily_set.matchups
    
    # Get all votes for today's matchups
    all_votes = db.query(models.UserChoice).join(models.Matchup).filter(
        models.Matchup.daily_set_id == daily_set.id
    ).all()
    
    # Count unique voters (by session_id)
    unique_sessions = set(vote.session_id for vote in all_votes if vote.session_id)
    total_voters = len(unique_sessions)
    total_votes = len(all_votes)
    
    # Calculate wins for each player
    player_stats = {pid: {"wins": 0, "total_matchups": 0, "votes_received": 0} for pid in players}
    
    for matchup in matchups:
        matchup_votes = [v for v in all_votes if v.matchup_id == matchup.id]
        
        if not matchup_votes:
            continue
        
        p1_votes = sum(1 for v in matchup_votes if v.winner_player_id == matchup.player1_id)
        p2_votes = sum(1 for v in matchup_votes if v.winner_player_id == matchup.player2_id)
        
        # Track votes received and matchups played
        if matchup.player1_id in player_stats:
            player_stats[matchup.player1_id]["votes_received"] += p1_votes
            player_stats[matchup.player1_id]["total_matchups"] += 1
        if matchup.player2_id in player_stats:
            player_stats[matchup.player2_id]["votes_received"] += p2_votes
            player_stats[matchup.player2_id]["total_matchups"] += 1
        
        # Determine winner of this matchup (who got more votes)
        if p1_votes > p2_votes and matchup.player1_id in player_stats:
            player_stats[matchup.player1_id]["wins"] += 1
        elif p2_votes > p1_votes and matchup.player2_id in player_stats:
            player_stats[matchup.player2_id]["wins"] += 1
    
    # Build rankings list
    rankings = []
    for pid, stats in player_stats.items():
        player = players[pid]
        win_pct = (stats["wins"] / stats["total_matchups"] * 100) if stats["total_matchups"] > 0 else 0
        rankings.append(PlayerRanking(
            id=pid,
            name=player.name,
            team=player.team,
            position=player.position,
            wins=stats["wins"],
            total_matchups=stats["total_matchups"],
            win_percentage=round(win_pct, 1),
            total_votes_received=stats["votes_received"]
        ))
    
    # Sort by wins (desc), then by votes received (desc)
    rankings.sort(key=lambda x: (x.wins, x.total_votes_received), reverse=True)
    
    return GlobalRankingsResponse(
        date=today,
        rankings=rankings,
        total_voters=total_voters,
        total_votes=total_votes
    )


class AllTimePlayerStats(BaseModel):
    id: str
    name: str
    team: str | None
    total_h2h_votes: int  # Total votes received across all matchups
    total_matchups: int   # Total matchups participated in
    h2h_wins: int         # Number of matchups won (got more votes than opponent)
    win_rate: float       # Win rate percentage


class AllTimeVotesResponse(BaseModel):
    players: list[AllTimePlayerStats]
    total_votes: int
    total_matchups: int


@router.get("/all-time-votes", response_model=AllTimeVotesResponse)
def get_all_time_votes(db: Session = Depends(get_db)):
    """
    Get all-time head-to-head vote tallies for all players.
    This aggregates votes across all daily sets ever played.
    """
    from collections import defaultdict
    
    # Get all matchups with their votes
    all_matchups = db.query(models.Matchup).all()
    all_votes = db.query(models.UserChoice).all()
    
    # Build vote lookup by matchup_id
    votes_by_matchup = defaultdict(list)
    for vote in all_votes:
        votes_by_matchup[vote.matchup_id].append(vote)
    
    # Track stats for each player
    player_stats = defaultdict(lambda: {
        "total_h2h_votes": 0,
        "total_matchups": 0,
        "h2h_wins": 0
    })
    
    # Get all players for name lookup
    all_players = {p.id: p for p in db.query(models.Player).all()}
    
    total_matchups_with_votes = 0
    
    for matchup in all_matchups:
        matchup_votes = votes_by_matchup.get(matchup.id, [])
        
        if not matchup_votes:
            continue
        
        total_matchups_with_votes += 1
        
        p1_votes = sum(1 for v in matchup_votes if v.winner_player_id == matchup.player1_id)
        p2_votes = sum(1 for v in matchup_votes if v.winner_player_id == matchup.player2_id)
        
        # Track stats for player 1
        player_stats[matchup.player1_id]["total_h2h_votes"] += p1_votes
        player_stats[matchup.player1_id]["total_matchups"] += 1
        
        # Track stats for player 2
        player_stats[matchup.player2_id]["total_h2h_votes"] += p2_votes
        player_stats[matchup.player2_id]["total_matchups"] += 1
        
        # Determine winner
        if p1_votes > p2_votes:
            player_stats[matchup.player1_id]["h2h_wins"] += 1
        elif p2_votes > p1_votes:
            player_stats[matchup.player2_id]["h2h_wins"] += 1
    
    # Build response
    players_list = []
    for player_id, stats in player_stats.items():
        player = all_players.get(player_id)
        if not player:
            continue
        
        win_rate = (stats["h2h_wins"] / stats["total_matchups"] * 100) if stats["total_matchups"] > 0 else 0
        
        players_list.append(AllTimePlayerStats(
            id=player_id,
            name=player.name,
            team=player.team,
            total_h2h_votes=stats["total_h2h_votes"],
            total_matchups=stats["total_matchups"],
            h2h_wins=stats["h2h_wins"],
            win_rate=round(win_rate, 1)
        ))
    
    # Sort by total votes received (desc)
    players_list.sort(key=lambda x: x.total_h2h_votes, reverse=True)
    
    return AllTimeVotesResponse(
        players=players_list,
        total_votes=len(all_votes),
        total_matchups=total_matchups_with_votes
    )
