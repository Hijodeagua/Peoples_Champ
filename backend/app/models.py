from datetime import datetime, date

from sqlalchemy import (
    Boolean,
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


class UserRankingHistory(Base):
    """
    Tracks each user's daily ranking submissions over time.
    Enables historical comparison and trend analysis.
    """
    __tablename__ = "user_ranking_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=True, index=True)  # For anonymous users
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # For logged-in users
    daily_set_id = Column(Integer, ForeignKey("daily_sets.id"), nullable=False)

    final_ranking = Column(Text, nullable=False)  # JSON array of player IDs in order
    score = Column(Integer, nullable=True)  # Points earned
    agreement_percentage = Column(Float, nullable=True)  # vs site average

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    daily_set = relationship("DailySet")

    __table_args__ = (
        UniqueConstraint("session_id", "daily_set_id", name="uq_session_daily_ranking"),
        UniqueConstraint("user_id", "daily_set_id", name="uq_user_daily_ranking"),
    )


class DailyAggregateStats(Base):
    """
    Site-wide daily aggregate statistics for comparison.
    Computed periodically to show consensus rankings.
    """
    __tablename__ = "daily_aggregate_stats"

    id = Column(Integer, primary_key=True, index=True)
    daily_set_id = Column(Integer, ForeignKey("daily_sets.id"), unique=True, nullable=False)

    average_ranking = Column(Text, nullable=True)  # JSON - computed average ranking
    total_submissions = Column(Integer, default=0)
    ranking_variance = Column(Text, nullable=True)  # JSON - how much disagreement per position

    computed_at = Column(DateTime, default=datetime.utcnow)

    daily_set = relationship("DailySet")


class AllTimeRanking(Base):
    """
    User's all-time GOAT rankings.
    Supports 10, 50, 100 player modes and infinite ranking.
    """
    __tablename__ = "all_time_rankings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    ranking_size = Column(Integer, nullable=False)  # 10, 50, 100, or 0 for infinite
    player_rankings = Column(Text, nullable=False)  # JSON - ordered list of player IDs with scores
    player_pool = Column(Text, nullable=True)  # JSON - custom list of players to rank from

    is_complete = Column(Boolean, default=False)
    matchups_completed = Column(Integer, default=0)
    total_matchups = Column(Integer, nullable=True)  # NULL for infinite mode

    share_slug = Column(String(50), unique=True, index=True, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class AllTimeMatchupVote(Base):
    """
    Individual matchup votes within an all-time ranking session.
    Used to compute Elo/Bradley-Terry scores.
    """
    __tablename__ = "all_time_matchup_votes"

    id = Column(Integer, primary_key=True, index=True)
    ranking_id = Column(Integer, ForeignKey("all_time_rankings.id"), nullable=False)

    player1_id = Column(String, ForeignKey("players.id"), nullable=False)
    player2_id = Column(String, ForeignKey("players.id"), nullable=False)
    winner_id = Column(String, ForeignKey("players.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    ranking = relationship("AllTimeRanking")
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])
    winner = relationship("Player", foreign_keys=[winner_id])


class CustomList(Base):
    """
    Custom comparison lists users can create and share.
    Allows users to create a subset of players to rank.
    """
    __tablename__ = "custom_lists"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    player_ids = Column(Text, nullable=False)  # JSON array of player IDs

    share_code = Column(String(20), unique=True, index=True, nullable=True)
    is_public = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class AnalysisCache(Base):
    """
    Cache for AI-generated analyses to reduce API costs.
    """
    __tablename__ = "analysis_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(255), unique=True, index=True, nullable=False)  # Hash of input params
    provider = Column(String(20), nullable=False)  # 'openai' or 'claude'

    analysis_text = Column(Text, nullable=False)
    input_hash = Column(String(64), nullable=False)  # SHA256 of rankings data

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration
