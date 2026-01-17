# Import all the models, so that Base has them before being
# imported by Alembic or when creating tables
from .session import Base  # noqa
from ..models import (  # noqa
    Player,
    DailySet,
    DailySetPlayer,
    Matchup,
    User,
    UserChoice,
    RatingHistory,
    Submission,
    AnalysisFeedback,
    UserRankingHistory,
    DailyAggregateStats,
    AllTimeRanking,
    AllTimeMatchupVote,
    CustomList,
    AnalysisCache,
)
