from datetime import datetime, date

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Text,
)
from sqlalchemy.orm import relationship

from .db.session import Base


class Player(Base):
    __tablename__ = "players"

    # bbref id like "jokicni01"
    id = Column(String, primary_key=True, index=True)

    name = Column(String, nullable=False)
    team = Column(String, nullable=True)
    position = Column(String, nullable=True)

    seasons = Column(Integer, nullable=False)          # number of seasons in sample
    current_age = Column(Integer, nullable=True)
    total_ws = Column(Float, nullable=False)

    ws_per_game = Column(Float, nullable=True)
    threes_per_game = Column(Float, nullable=True)
    ast_per_game = Column(Float, nullable=True)
    stl_per_game = Column(Float, nullable=True)
    trb_per_game = Column(Float, nullable=True)
    blk_per_game = Column(Float, nullable=True)
    pts_per_game = Column(Float, nullable=True)

    three_pct = Column(Float, nullable=True)
    ft_pct = Column(Float, nullable=True)
    ts_pct = Column(Float, nullable=True)
    efg_pct = Column(Float, nullable=True)

    initial_rating = Column(Float, nullable=False)
    current_rating = Column(Float, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    rating_history = relationship("RatingHistory", back_populates="player")
    user_choices = relationship("UserChoice", back_populates="winner_player")


class DailySet(Base):
    """
    One row per date that has a game set.
    Players in the set are stored in a separate join table.
    """

    __tablename__ = "daily_sets"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False)

    true_ranking = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    players = relationship("DailySetPlayer", back_populates="daily_set")
    matchups = relationship("Matchup", back_populates="daily_set")


class DailySetPlayer(Base):
    """
    Join table linking a daily set to its 5 players.
    """

    __tablename__ = "daily_set_players"

    id = Column(Integer, primary_key=True, index=True)
    daily_set_id = Column(Integer, ForeignKey("daily_sets.id"), nullable=False)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)

    daily_set = relationship("DailySet", back_populates="players")
    player = relationship("Player")

    __table_args__ = (
        UniqueConstraint("daily_set_id", "player_id", name="uq_dailyset_player"),
    )


class Matchup(Base):
    """
    A single head to head pairing within a daily set.
    """

    __tablename__ = "matchups"

    id = Column(Integer, primary_key=True, index=True)
    daily_set_id = Column(Integer, ForeignKey("daily_sets.id"), nullable=False)

    player1_id = Column(String, ForeignKey("players.id"), nullable=False)
    player2_id = Column(String, ForeignKey("players.id"), nullable=False)

    # optional index 0-9 for ordering within the set
    order_index = Column(Integer, nullable=True)

    daily_set = relationship("DailySet", back_populates="matchups")
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])

    user_choices = relationship("UserChoice", back_populates="matchup")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    choices = relationship("UserChoice", back_populates="user")


class UserChoice(Base):
    """
    One row per user answer on a matchup.
    Supports both authenticated users (user_id) and anonymous users (session_id).
    """

    __tablename__ = "user_choices"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for anonymous users
    session_id = Column(String, nullable=True)  # For anonymous users
    matchup_id = Column(Integer, ForeignKey("matchups.id"), nullable=False)

    winner_player_id = Column(String, ForeignKey("players.id"), nullable=False)
    rationale_tag = Column(String, nullable=True)  # "stats", "legacy", "that boy nice", etc.

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="choices")
    matchup = relationship("Matchup", back_populates="user_choices")
    winner_player = relationship("Player", back_populates="user_choices")

    __table_args__ = (
        # Ensure one vote per user/session per matchup
        UniqueConstraint("user_id", "matchup_id", name="uq_user_matchup"),
        UniqueConstraint("session_id", "matchup_id", name="uq_session_matchup"),
    )


class RatingHistory(Base):
    """
    Nightly snapshot of player ratings so you can
    show historical graphs and score users against a frozen rating.
    """

    __tablename__ = "rating_history"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)

    date = Column(Date, nullable=False)
    rating = Column(Float, nullable=False)

    player = relationship("Player", back_populates="rating_history")

    __table_args__ = (
        UniqueConstraint("player_id", "date", name="uq_player_date"),
    )


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    daily_set_id = Column(Integer, ForeignKey("daily_sets.id"), nullable=False)
    mode = Column(String, nullable=False)

    answers = Column(Text, nullable=False)
    final_ranking = Column(Text, nullable=False)
    score = Column(Integer, nullable=True)
    share_slug = Column(String, unique=True, index=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


class AnalysisFeedback(Base):
    __tablename__ = "analysis_feedback"

    id = Column(Integer, primary_key=True, index=True)
    analysis_text = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
