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


router = APIRouter(prefix="/game", tags=["game"])


class PlayerOut(BaseModel):
    id: str
    name: str
    team: Optional[str]


class MatchupOut(BaseModel):
    id: int
    player_a_id: str
    player_b_id: str
    order_index: int


class GameTodayResponse(BaseModel):
    daily_set_id: int
    date: date
    mode_options: List[str]
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


def int_to_base36(number: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if number == 0:
        return "0"
    result = ""
    while number:
        number, rem = divmod(number, 36)
        result = chars[rem] + result
    return result


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


@router.get("/today", response_model=GameTodayResponse)
def get_today(db: Session = Depends(get_db)):
    today = date.today()
    daily_set = db.query(models.DailySet).filter(models.DailySet.date == today).first()

    if not daily_set:
        players = (
            db.query(models.Player)
            .order_by(func.random())
            .limit(5)
            .all()
        )
        if len(players) < 5:
            raise HTTPException(status_code=400, detail="Not enough players to build daily set")

        daily_set = models.DailySet(date=today)
        db.add(daily_set)
        db.flush()

        for player in players:
            db.add(
                models.DailySetPlayer(
                    daily_set_id=daily_set.id,
                    player_id=player.id,
                )
            )

        true_ranking_ids = [p.id for p in players]
        random.shuffle(true_ranking_ids)
        daily_set.true_ranking = json.dumps(true_ranking_ids)

        for idx, (p1, p2) in enumerate(combinations(players, 2)):
            db.add(
                models.Matchup(
                    daily_set_id=daily_set.id,
                    player1_id=p1.id,
                    player2_id=p2.id,
                    order_index=idx,
                )
            )

        db.commit()
        db.refresh(daily_set)

    players = [dsp.player for dsp in daily_set.players]
    matchups = sorted(daily_set.matchups, key=lambda m: m.order_index or 0)

    return GameTodayResponse(
        daily_set_id=daily_set.id,
        date=daily_set.date,
        mode_options=["GUESS", "OWN"],
        players=[PlayerOut(id=p.id, name=p.name, team=p.team) for p in players],
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

    if len(request.answers) != 10:
        raise HTTPException(status_code=400, detail="Must answer all matchups")
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
