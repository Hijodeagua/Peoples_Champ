import { useCallback, useEffect, useState } from "react";
import { getTodayGame, type GameTodayResponse, type Player, type SeasonOption, type PlayerStats, type AdvancedStats } from "../api/game";
import { submitVote, getVotingStatus, type UserVotesResponse } from "../api/voting";
import { getPlayerImageUrl } from "../utils/playerImages";

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

// Stats view mode: "pergame" or "advanced"
type StatsViewMode = "pergame" | "advanced";

// Get stat value, percentile, and position rank from stats object
function getStatData(stats: PlayerStats | AdvancedStats, statKey: string): { 
  value: number | null; 
  pctl: number | null; 
  posRank: number | null;
} {
  const value = stats[statKey as keyof typeof stats] as number | null;
  // For percentage stats like "efg_pct", the percentile key is "efg_pctl" (not "efg_pct_pctl")
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
  
  // Color based on percentile
  const getBarColor = (p: number) => {
    if (p >= 90) return "bg-emerald-500";
    if (p >= 75) return "bg-emerald-400";
    if (p >= 50) return "bg-yellow-400";
    if (p >= 25) return "bg-orange-400";
    return "bg-red-400";
  };

  const formattedValue = isPercentage 
    ? `${displayValue.toFixed(1)}%` 
    : displayValue.toFixed(1);

  // Format position rank display
  const posRankDisplay = posRank && posCount ? `#${posRank}/${posCount}` : null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-slate-400 font-medium">{label}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor(pctl)} transition-all duration-300`}
          style={{ width: `${Math.max(pctl, 2)}%` }}
        />
      </div>
      <span className="w-12 text-right font-semibold">{formattedValue}</span>
      <span className="w-10 text-slate-500 text-right">{pctl.toFixed(0)}%</span>
      {posRankDisplay && (
        <span className="w-14 text-slate-400 text-right text-[10px]">{posRankDisplay}</span>
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
  
  // Determine which stats to show based on mode
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
      className={`w-full text-left rounded-xl p-5 shadow border transition hover:bg-slate-800/50 bg-slate-800/30 backdrop-blur cursor-pointer ${
        isSelected ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-700"
      }`}
    >
      <div className="flex items-center gap-4 mb-4">
        <img
          src={getPlayerImageUrl(player.name)}
          alt={player.name}
          className="w-20 h-16 object-cover rounded-lg bg-slate-700"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold">{player.name}</p>
            {stats?.games && (
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                {stats.games} GP
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            {player.team} {player.position && `• ${player.position}`}
          </p>
        </div>
      </div>
      
      {currentStats && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-700">
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

  const loadGameData = useCallback(async (season: SeasonOption = "current") => {
    setLoading(true);
    setError(null);
    try {
      const [game, status] = await Promise.all([
        getTodayGame(season),
        getVotingStatus()
      ]);
      setGameData(game);
      setVotingStatus(status);
    } catch (err: unknown) {
      console.error("[MatchupView] Load error:", err);
      // Handle axios errors which have response.data
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }, status?: number } };
        const detail = axiosErr.response?.data?.detail;
        const status = axiosErr.response?.status;
        if (status === 502 || status === 503) {
          setError("Server is starting up. Please wait 30 seconds and try again.");
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

  const handleSubmit = async () => {
    if (!gameData || !selectedPlayerId) return;
    
    const currentMatchup = gameData.matchups[currentMatchupIndex];
    if (!currentMatchup) return;
    
    try {
      await submitVote(currentMatchup.id, selectedPlayerId);
      
      // Store the vote locally
      setVotes(prev => ({ ...prev, [currentMatchup.id]: selectedPlayerId }));
      
      // Move to next matchup
      const nextIndex = currentMatchupIndex + 1;
      if (nextIndex < gameData.matchups.length) {
        setCurrentMatchupIndex(nextIndex);
        setSelectedPlayerId(null);
      }
      
      // Refresh voting status
      const status = await getVotingStatus();
      setVotingStatus(status);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading today's matchups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-4 rounded-lg max-w-md text-center">
          <p className="font-semibold mb-2">Error Loading Game</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!gameData || !votingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="text-6xl">🏀</div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-200">No Matchups Available</h2>
          <p className="text-slate-400 max-w-md">
            We couldn't load today's matchups. The server might be waking up - please try again in a moment.
          </p>
        </div>
        <button
          onClick={() => loadGameData(selectedSeason)}
          className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition"
        >
          Retry Loading
        </button>
        <p className="text-xs text-slate-500">
          If this persists, the backend server may be starting up (takes ~30 seconds).
        </p>
      </div>
    );
  }

  // Defensive check for empty matchups array
  if (!gameData.matchups || gameData.matchups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="text-6xl">📅</div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-200">No Matchups Scheduled</h2>
          <p className="text-slate-400 max-w-md">
            There are no matchups scheduled for today. Check back tomorrow or visit the Archive to replay past games.
          </p>
        </div>
        <a
          href="/archive"
          className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition"
        >
          View Archive
        </a>
      </div>
    );
  }

  const currentMatchup = gameData.matchups[currentMatchupIndex];
  if (!currentMatchup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-6xl">❓</div>
        <p className="text-slate-300 text-lg">Matchup not found.</p>
        <button
          onClick={() => setCurrentMatchupIndex(0)}
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
        >
          Go to First Matchup
        </button>
      </div>
    );
  }

  const player1 = gameData.players.find(p => p.id === currentMatchup.player_a_id);
  const player2 = gameData.players.find(p => p.id === currentMatchup.player_b_id);
  const isCompleted = votingStatus.completed;
  const hasVotedOnCurrent = currentMatchup && votes[currentMatchup.id];

  return (
    <div className="space-y-8">
      <header className="text-center space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 font-semibold">
          PEOPLE&apos;S CHAMP
        </p>
        <h1 className="text-4xl font-bold">Who is the best player right now?</h1>
        <p className="text-slate-300 max-w-3xl mx-auto leading-relaxed">
          We are using regular season stats from the two seasons before this year to decide which star has the stronger case. Pick the season you think was better.
        </p>
      </header>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-3 rounded">
          {error}
        </div>
      )}

      {/* Season and Stats Toggle Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Season Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => handleSeasonChange("current")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              selectedSeason === "current"
                ? "bg-emerald-500 text-black"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => handleSeasonChange("combined")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              selectedSeason === "combined"
                ? "bg-emerald-500 text-black"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            This Year and Last
          </button>
        </div>

        {/* Stats View Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setStatsViewMode("pergame")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              statsViewMode === "pergame"
                ? "bg-purple-500 text-white"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Per Game
          </button>
          <button
            onClick={() => setStatsViewMode("advanced")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              statsViewMode === "advanced"
                ? "bg-amber-500 text-black"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {!isCompleted && (
        <p className="text-center text-sm text-slate-400 font-medium">
          Matchup {currentMatchupIndex + 1} of {gameData.matchups.length} • {votingStatus.votes_today} votes submitted
        </p>
      )}

      {isCompleted ? (
        <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-emerald-400">You&apos;re done for today!</h2>
          <p className="text-slate-300 text-lg">
            You&apos;ve completed all {gameData.matchups.length} matchups. Come back tomorrow for more!
          </p>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-emerald-400 font-semibold mb-2">✓ Your votes have been saved!</p>
            <p className="text-slate-400 text-sm">
              Your votes are now part of the People&apos;s Rankings. View the combined results on the Rankings page.
            </p>
          </div>
          <a
            href="/rankings"
            className="inline-block px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition"
          >
            View People&apos;s Rankings
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {currentMatchupIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
              >
                Previous
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedPlayerId || loading}
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold shadow-lg hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {hasVotedOnCurrent ? "Update Vote" : "Submit Vote"}
            </button>
            {currentMatchupIndex < gameData.matchups.length - 1 && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Skip
              </button>
            )}
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-slate-400 text-center">
        * Stats pulled from Basketball Reference. 
        {selectedSeason === "current" ? " Showing 2025-26 season only." : " Showing combined 2024-25 & 2025-26 stats."}
      </p>
    </div>
  );
}
