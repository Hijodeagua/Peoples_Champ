import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDayGame, type GameTodayResponse, type Player, type SeasonOption, type PlayerStats, type AdvancedStats } from "../api/game";
import { submitVote } from "../api/voting";

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

type StatsViewMode = "pergame" | "advanced";

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

function PercentileBar({ 
  value, 
  percentile, 
  label, 
  isPercentage = false 
}: { 
  value: number | null; 
  percentile: number | null; 
  label: string;
  isPercentage?: boolean;
}) {
  const pctl = percentile ?? 0;
  const displayValue = value ?? 0;
  
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
    </div>
  );
}

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
  
  const isPercentageStat = (key: string) => key.includes("pct") || key === "ws_48";
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl p-5 shadow border transition hover:bg-slate-800/50 bg-slate-800/30 backdrop-blur cursor-pointer ${
        isSelected ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xl font-bold">{player.name}</p>
          <p className="text-sm text-slate-400">
            {player.team} {player.position && `• ${player.position}`}
          </p>
        </div>
        {stats?.games && (
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
            {stats.games} GP
          </span>
        )}
      </div>
      
      {currentStats && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-700">
          {statsToShow.map((statKey) => {
            const { value, pctl } = getStatData(currentStats, statKey);
            const label = labelMap[statKey] || statKey.toUpperCase();
            return (
              <PercentileBar 
                key={statKey}
                label={label} 
                value={value} 
                percentile={pctl}
                isPercentage={isPercentageStat(statKey)}
              />
            );
          })}
        </div>
      )}
    </button>
  );
}

export default function ReplayPage() {
  const { date } = useParams<{ date: string }>();
  const [gameData, setGameData] = useState<GameTodayResponse | null>(null);
  const [currentMatchupIndex, setCurrentMatchupIndex] = useState<number>(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<number, string>>({});
  const [selectedSeason, setSelectedSeason] = useState<SeasonOption>("current");
  const [statsViewMode, setStatsViewMode] = useState<StatsViewMode>("pergame");

  const loadGameData = useCallback(async (season: SeasonOption = "current") => {
    if (!date) return;
    
    setLoading(true);
    setError(null);
    try {
      const game = await getDayGame(date, season);
      setGameData(game);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("403")) {
          setError("Vault access limited to past 7 days");
        } else if (err.message.includes("404")) {
          setError("No game found for this date");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to load game data");
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

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
      setVotes(prev => ({ ...prev, [currentMatchup.id]: selectedPlayerId }));
      
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

  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading game from {formattedDate}...</p>
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
        <Link
          to="/archive"
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 transition"
        >
          Back to Archive
        </Link>
      </div>
    );
  }

  if (!gameData || !gameData.matchups || gameData.matchups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-300">No matchups available for this date.</p>
        <Link
          to="/archive"
          className="mt-4 inline-block px-4 py-2 rounded-lg bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 transition"
        >
          Back to Archive
        </Link>
      </div>
    );
  }

  const currentMatchup = gameData.matchups[currentMatchupIndex];
  if (!currentMatchup) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-300">Matchup not found.</p>
      </div>
    );
  }

  const player1 = gameData.players.find(p => p.id === currentMatchup.player_a_id);
  const player2 = gameData.players.find(p => p.id === currentMatchup.player_b_id);
  const isCompleted = currentMatchupIndex >= gameData.matchups.length - 1 && votes[currentMatchup.id];

  return (
    <div className="space-y-8">
      <header className="text-center space-y-3">
        <Link to="/archive" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
          ← Back to Archive
        </Link>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-400 font-semibold">
          VAULT REPLAY
        </p>
        <h1 className="text-4xl font-bold">{formattedDate}</h1>
        <p className="text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Replaying matchups from the vault. Your votes still count!
        </p>
      </header>

      {/* Season and Stats Toggle Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
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

      <p className="text-center text-sm text-slate-400 font-medium">
        Matchup {currentMatchupIndex + 1} of {gameData.matchups.length}
      </p>

      {isCompleted ? (
        <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-emerald-400">Replay Complete!</h2>
          <p className="text-slate-300 text-lg">
            You've completed all {gameData.matchups.length} matchups from {formattedDate}.
          </p>
          <Link
            to="/archive"
            className="inline-block mt-4 px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition"
          >
            Back to Archive
          </Link>
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
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedPlayerId || loading}
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold shadow-lg hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Submit Vote
            </button>
            {currentMatchupIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
              >
                Previous
              </button>
            )}
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
