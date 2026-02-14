import { useCallback, useEffect, useState } from "react";
import { getTodayGame, getMyVotes, type GameTodayResponse, type Player, type SeasonOption, type PlayerStats, type AdvancedStats } from "../api/game";
import { submitVote, type UserVotesResponse } from "../api/voting";
import { getPlayerImageUrl } from "../utils/playerImages";
import AgreementIndicator from "./AgreementIndicator";
import FeedbackLink from "./FeedbackLink";
import { formatDailyTopFiveShareText, rankPlayersFromVotes } from "../utils/dailyShare";
import { trackStartRanking, trackVoteSubmitted, trackRankingCompleted, trackShareCompleted } from "../utils/analytics";

// Stat label mapping for per-game stats
const STAT_LABELS: Record<string, string> = {
  pts: "PTS",
  reb: "REB",
  ast: "AST",
  stl: "STL",
  blk: "BLK",
  three_pct: "3P%",
  ft_pct: "FT%",
  efg_pct: "eFG%",
  tov: "TOV",
  mpg: "MPG",
};

// Advanced stat labels
const ADV_STAT_LABELS: Record<string, string> = {
  per: "PER",
  ts_pct: "TS%",
  ws: "WS",
  ws_48: "WS/48",
  bpm: "BPM",
  vorp: "VORP",
  usg_pct: "USG%",
  obpm: "OBPM",
  dbpm: "DBPM",
};

// Stats view mode
type StatsViewMode = "pergame" | "advanced";

// Get stat value, percentile, and position rank from stats object
function getStatData(stats: PlayerStats | AdvancedStats, statKey: string): {
  value: number | null;
  pctl: number | null;
  posRank: number | null;
} {
  const value = stats[statKey as keyof typeof stats] as number | null;
  const baseKey = statKey.replace(/_pct$/, '');
  const pctlKey = `${baseKey}_pctl` as keyof typeof stats;
  const pctl = stats[pctlKey] as number | null;
  const posRankKey = `${baseKey}_pos_rank` as keyof typeof stats;
  const posRank = stats[posRankKey] as number | null;
  return { value, pctl, posRank };
}

// Percentile bar component with position rank
function PercentileBar({
  value,
  percentile,
  label,
  posRank,
  posCount,
  isPercentage = false
}: {
  value: number | null;
  percentile: number | null;
  label: string;
  posRank?: number | null;
  posCount?: number | null;
  isPercentage?: boolean;
}) {
  const pctl = percentile ?? 0;
  const displayValue = value ?? 0;

  const getBarColor = (p: number) => {
    if (p >= 90) return "bg-emerald-500";
    if (p >= 75) return "bg-emerald-400/80";
    if (p >= 50) return "bg-yellow-400/80";
    if (p >= 25) return "bg-orange-400/80";
    return "bg-red-400/80";
  };

  const formattedValue = isPercentage
    ? `${displayValue.toFixed(1)}%`
    : displayValue.toFixed(1);

  const posRankDisplay = posRank && posCount ? `#${posRank}/${posCount}` : null;

  return (
    <div className="flex items-center gap-2 text-xs group">
      <span className="w-10 text-slate-500 font-medium">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(pctl)} stat-bar`}
          style={{ width: `${Math.max(pctl, 3)}%` }}
        />
      </div>
      <span className="w-12 text-right font-semibold text-slate-200">{formattedValue}</span>
      <span className="w-9 text-slate-600 text-right text-[10px]">{pctl.toFixed(0)}%</span>
      {posRankDisplay && (
        <span className="w-14 text-slate-600 text-right text-[10px] hidden sm:inline">{posRankDisplay}</span>
      )}
    </div>
  );
}

// Player card with stats
function PlayerCard({
  player,
  isSelected,
  onClick,
  statsViewMode = "pergame",
}: {
  player: Player;
  isSelected: boolean;
  onClick: () => void;
  statsViewMode?: StatsViewMode;
}) {
  const stats = player.stats;
  const advanced = player.advanced;

  const isAdvancedMode = statsViewMode === "advanced";
  const statsToShow = isAdvancedMode
    ? ["per", "ts_pct", "ws", "ws_48", "bpm", "vorp"]
    : ["pts", "reb", "ast", "stl", "blk", "efg_pct", "three_pct"];

  const currentStats = isAdvancedMode ? advanced : stats;
  const labelMap = isAdvancedMode ? ADV_STAT_LABELS : STAT_LABELS;
  const posCount = stats?.pos_count ?? null;

  const isPercentageStat = (key: string) => key.includes("pct") || key === "ws_48";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer active:scale-[0.99] ${
        isSelected
          ? "card-elevated border-2 !border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10"
          : "card-elevated hover:border-slate-600/50 hover:shadow-2xl"
      }`}
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="relative shrink-0">
          <img
            src={getPlayerImageUrl(player.name)}
            alt={player.name}
            className="w-14 h-12 sm:w-16 sm:h-14 object-cover rounded-xl bg-slate-700/50"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base sm:text-lg font-bold truncate">{player.name}</p>
            {stats?.games && (
              <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full shrink-0">
                {stats.games} GP
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {player.team} {player.position && `· ${player.position}`}
          </p>
        </div>
      </div>

      {currentStats && (
        <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-700/50">
          {statsToShow.map((statKey) => {
            const { value, pctl, posRank } = getStatData(currentStats, statKey);
            const label = labelMap[statKey] || statKey.toUpperCase();
            return (
              <PercentileBar
                key={statKey}
                label={label}
                value={value}
                percentile={pctl}
                posRank={!isAdvancedMode ? posRank : null}
                posCount={!isAdvancedMode ? posCount : null}
                isPercentage={isPercentageStat(statKey)}
              />
            );
          })}
        </div>
      )}
    </button>
  );
}

export default function MatchupView() {
  const [gameData, setGameData] = useState<GameTodayResponse | null>(null);
  const [currentMatchupIndex, setCurrentMatchupIndex] = useState<number>(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [votingStatus, setVotingStatus] = useState<UserVotesResponse | null>(null);
  const [votes, setVotes] = useState<Record<number, string>>({});
  const [selectedSeason, setSelectedSeason] = useState<SeasonOption>("current");
  const [statsViewMode, setStatsViewMode] = useState<StatsViewMode>("pergame");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [manualShareText, setManualShareText] = useState<string | null>(null);

  const loadGameData = useCallback(async (season: SeasonOption = "current") => {
    setLoading(true);
    setError(null);
    try {
      const [game, myVotes] = await Promise.all([
        getTodayGame(season),
        getMyVotes()
      ]);
      setGameData(game);
      setVotingStatus({
        votes_today: myVotes.votes_today,
        total_matchups: myVotes.total_matchups,
        completed: myVotes.completed
      });

      // Fire start_ranking event when user first sees the game (not on revisit when already completed)
      if (!myVotes.completed && Object.keys(myVotes.votes).length === 0) {
        trackStartRanking(game.daily_set_id, game.players.length);
      }

      // Restore previous votes from server
      setVotes(myVotes.votes);

      // Skip to first unvoted matchup
      if (Object.keys(myVotes.votes).length > 0 && game.matchups) {
        const firstUnvotedIndex = game.matchups.findIndex(m => !myVotes.votes[m.id]);
        if (firstUnvotedIndex >= 0) {
          setCurrentMatchupIndex(firstUnvotedIndex);
        } else if (myVotes.completed) {
          setCurrentMatchupIndex(game.matchups.length - 1);
        }
      }
    } catch (err: unknown) {
      console.error("[MatchupView] Load error:", err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }, status?: number } };
        const detail = axiosErr.response?.data?.detail;
        const status = axiosErr.response?.status;
        if (status === 502 || status === 503) {
          setError("Server is starting up. Please wait a moment and try again.");
        } else if (detail) {
          setError(detail);
        } else {
          setError(`Server error (${status || 'unknown'}). Please try again.`);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load game data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGameData(selectedSeason);
  }, [loadGameData, selectedSeason]);

  const handleSeasonChange = (season: SeasonOption) => {
    setSelectedSeason(season);
  };

  const getShareText = () => {
    if (!gameData) return null;

    const rankedPlayers = rankPlayersFromVotes(gameData.players, gameData.matchups, votes);
    const topFiveNames = rankedPlayers.slice(0, 5).map((player) => player.name);
    return formatDailyTopFiveShareText(topFiveNames);
  };

  const handleShareTopFive = async () => {
    const shareText = getShareText();
    if (!shareText) {
      return;
    }

    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          text: `${shareText}\n\n${shareUrl}`.trim(),
          title: "My Daily Top 5",
        });
        setShareMessage("Shared successfully.");
        setManualShareText(null);
        trackShareCompleted("native_share");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`.trim());
        setShareMessage("Copied to clipboard.");
        setManualShareText(null);
        trackShareCompleted("clipboard");
        return;
      }

      setManualShareText(`${shareText}\n\n${shareUrl}`.trim());
      setShareMessage("Copy the text below.");
      trackShareCompleted("manual_copy");
    } catch (err) {
      setManualShareText(`${shareText}\n\n${shareUrl}`.trim());
      setShareMessage("Copy the text below.");
      trackShareCompleted("manual_copy");
    }
  };

  const handleSubmit = async () => {
    if (!gameData || !selectedPlayerId) return;

    const currentMatchup = gameData.matchups[currentMatchupIndex];
    if (!currentMatchup) return;

    try {
      await submitVote(currentMatchup.id, selectedPlayerId);

      const newVotes = { ...votes, [currentMatchup.id]: selectedPlayerId };
      setVotes(newVotes);

      const votesCount = Object.keys(newVotes).length;
      const isNowCompleted = votesCount >= gameData.matchups.length;
      setVotingStatus({
        votes_today: votesCount,
        total_matchups: gameData.matchups.length,
        completed: isNowCompleted,
      });

      trackVoteSubmitted(currentMatchupIndex, gameData.matchups.length);
      if (isNowCompleted) {
        trackRankingCompleted(gameData.daily_set_id, gameData.matchups.length);
      }

      // Move to next matchup
      const nextIndex = currentMatchupIndex + 1;
      if (nextIndex < gameData.matchups.length) {
        setCurrentMatchupIndex(nextIndex);
        setSelectedPlayerId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    }
  };

  const handleSkip = () => {
    const nextIndex = currentMatchupIndex + 1;
    if (nextIndex < (gameData?.matchups.length || 0)) {
      setCurrentMatchupIndex(nextIndex);
      setSelectedPlayerId(null);
    }
  };

  const handlePrevious = () => {
    if (currentMatchupIndex > 0) {
      setCurrentMatchupIndex(currentMatchupIndex - 1);
      const prevMatchup = gameData?.matchups[currentMatchupIndex - 1];
      if (prevMatchup && votes[prevMatchup.id]) {
        setSelectedPlayerId(votes[prevMatchup.id]);
      } else {
        setSelectedPlayerId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-emerald-500 mx-auto"></div>
          <p className="text-sm text-slate-400">Loading today's matchups...</p>
          <p className="text-xs text-slate-500">Waking the server if needed. This can take up to a minute on first visit.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="card-elevated p-6 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-200 mb-2">Error Loading Game</p>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => loadGameData(selectedSeason)}
            className="btn-primary text-sm px-5 py-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!gameData || !votingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="card-elevated p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">No Matchups Available</h2>
          <p className="text-slate-500 text-sm mb-4">
            The server might be starting up. Please try again shortly.
          </p>
          <button
            onClick={() => loadGameData(selectedSeason)}
            className="btn-primary text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameData.matchups || gameData.matchups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="card-elevated p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-slate-200 mb-2">No Matchups Scheduled</h2>
          <p className="text-slate-500 text-sm mb-4">
            Check back tomorrow or visit the Archive to replay past games.
          </p>
          <a href="/archive" className="btn-gold text-sm">
            View Archive
          </a>
        </div>
      </div>
    );
  }

  const currentMatchup = gameData.matchups[currentMatchupIndex];
  if (!currentMatchup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-slate-400">Matchup not found.</p>
        <button onClick={() => setCurrentMatchupIndex(0)} className="btn-secondary text-sm">
          Go to First Matchup
        </button>
      </div>
    );
  }

  const player1 = gameData.players.find(p => p.id === currentMatchup.player_a_id);
  const player2 = gameData.players.find(p => p.id === currentMatchup.player_b_id);
  const isCompleted = votingStatus.completed;
  const hasVotedOnCurrent = currentMatchup && votes[currentMatchup.id];
  const progressPercent = gameData.matchups.length > 0
    ? Math.round((Object.keys(votes).length / gameData.matchups.length) * 100)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 font-semibold">
          PEOPLES CHAMP
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Who is the best player right now?</h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed hidden sm:block">
          Compare stats from recent seasons and pick your winner.
        </p>
      </header>

      {error && (
        <div className="glass rounded-xl p-3 text-red-300 text-sm text-center">
          {error}
          <FeedbackLink variant="compact" className="mt-2 block" />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {/* Season Toggle */}
        <div className="flex items-center gap-0.5 glass rounded-lg p-0.5 sm:p-1">
          <button
            onClick={() => handleSeasonChange("current")}
            className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedSeason === "current"
                ? "bg-emerald-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => handleSeasonChange("combined")}
            className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedSeason === "combined"
                ? "bg-emerald-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Two Seasons
          </button>
        </div>

        {/* Stats View Toggle */}
        <div className="flex items-center gap-0.5 glass rounded-lg p-0.5 sm:p-1">
          <button
            onClick={() => setStatsViewMode("pergame")}
            className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-all ${
              statsViewMode === "pergame"
                ? "bg-purple-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Per Game
          </button>
          <button
            onClick={() => setStatsViewMode("advanced")}
            className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-all ${
              statsViewMode === "advanced"
                ? "bg-amber-500 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {!isCompleted && (
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Matchup {currentMatchupIndex + 1} of {gameData.matchups.length}</span>
            <span>{votingStatus.votes_today} votes submitted</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {isCompleted ? (
        <div className="max-w-lg mx-auto text-center py-12 space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">You&apos;re done for today!</h2>
            <p className="text-slate-400">
              All {gameData.matchups.length} matchups completed. Come back tomorrow!
            </p>
          </div>

          <div className="max-w-sm mx-auto">
            <AgreementIndicator />
          </div>

          <div className="glass rounded-xl p-4 max-w-sm mx-auto">
            <p className="text-emerald-400 font-semibold text-sm mb-1">Your votes have been saved</p>
            <p className="text-slate-500 text-xs">
              Your picks are now part of the People&apos;s Rankings.
            </p>
          </div>

          <div className="space-y-2">
            <button type="button" onClick={handleShareTopFive} className="btn-secondary inline-block">
              Share My Top 5
            </button>
            {shareMessage && <p className="text-xs text-slate-400">{shareMessage}</p>}
            {manualShareText && (
              <textarea
                readOnly
                value={manualShareText}
                className="w-full max-w-md mx-auto min-h-32 glass rounded-xl p-3 text-sm text-slate-200"
              />
            )}
          </div>

          <a href="/rankings" className="btn-primary inline-block">
            View People&apos;s Rankings
          </a>
        </div>
      ) : (
        <>
          {/* Matchup Cards with VS divider */}
          <div className="relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8">
              <div>
                {player1 && (
                  <PlayerCard
                    player={player1}
                    isSelected={selectedPlayerId === player1.id}
                    onClick={() => setSelectedPlayerId(player1.id)}
                    statsViewMode={statsViewMode}
                  />
                )}
              </div>

              {/* Mobile VS Badge */}
              <div className="flex md:hidden justify-center -my-1.5 relative z-10">
                <div className="vs-badge-mobile">VS</div>
              </div>

              <div>
                {player2 && (
                  <PlayerCard
                    player={player2}
                    isSelected={selectedPlayerId === player2.id}
                    onClick={() => setSelectedPlayerId(player2.id)}
                    statsViewMode={statsViewMode}
                  />
                )}
              </div>
            </div>
            {/* Desktop VS Badge */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="vs-badge">VS</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 px-4 sm:px-0">
            {currentMatchupIndex > 0 && (
              <button type="button" onClick={handlePrevious} className="btn-secondary text-sm px-4 py-2.5 sm:px-5">
                Prev
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedPlayerId || loading}
              className="btn-primary flex-1 sm:flex-none max-w-[200px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {hasVotedOnCurrent ? "Update Vote" : "Submit Vote"}
            </button>
            {currentMatchupIndex < gameData.matchups.length - 1 && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="btn-secondary text-sm px-4 py-2.5 sm:px-5 disabled:opacity-40"
              >
                Skip
              </button>
            )}
          </div>
        </>
      )}

      <p className="text-[10px] text-slate-600 text-center">
        Stats from Basketball Reference.
        {selectedSeason === "current" ? " Current season." : " Combined two-season stats."}
      </p>
    </div>
  );
}
