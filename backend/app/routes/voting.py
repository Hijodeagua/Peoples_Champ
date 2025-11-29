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
