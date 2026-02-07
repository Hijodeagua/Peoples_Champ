import { useState, useCallback, useEffect } from "react";
import SocialGraphicGenerator from "../components/SocialGraphicGenerator";
import FeedbackLink from "../components/FeedbackLink";
import apiClient from "../api/client";
import { getPlayerImageUrlWithFallback } from "../utils/playerImages";

type RankingSize = 10 | 50 | 100 | 0; // 0 = infinite

interface Preset {
  id: string;
  name: string;
  description: string;
  player_count: number;
}

interface StatWithRank {
  value: number;
  rank: number;
  percentile: number;
}

interface PlayerStats {
  games: StatWithRank;
  points: StatWithRank;
  rebounds: StatWithRank;
  assists: StatWithRank;
  steals: StatWithRank;
  blocks: StatWithRank;
  fg_pct: StatWithRank;
  ts_pct: StatWithRank;
  win_shares: StatWithRank;
  career_from: string;
  career_to: string;
}

interface MatchupPlayer {
  player1_id: string;
  player1_name: string;
  player1_team: string | null;
  player1_position: string | null;
  player1_stats: PlayerStats | null;
  player2_id: string;
  player2_name: string;
  player2_team: string | null;
  player2_position: string | null;
  player2_stats: PlayerStats | null;
}

interface RankingEntry {
  rank: number;
  player_id: string;
  player_name: string;
  team: string | null;
  position: string | null;
  score: number;
  wins: number;
  losses: number;
  jersey_number?: number | null;
}

type GamePhase = "select" | "playing" | "results";

// Stat display component for all-time player cards
function PlayerStatGrid({ stats, showAdvanced }: { stats: PlayerStats; showAdvanced: boolean }) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-600/50 text-left">
      <div className="text-xs text-slate-500 mb-2">
        {stats.career_from} - {stats.career_to}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          { label: "G", stat: stats.games },
          { label: "PTS", stat: stats.points },
          { label: "REB", stat: stats.rebounds },
          { label: "AST", stat: stats.assists },
          { label: "STL", stat: stats.steals },
          { label: "BLK", stat: stats.blocks },
          { label: "FG%", stat: stats.fg_pct, isPct: true },
          { label: "WS", stat: stats.win_shares, isWS: true },
        ].map(({ label, stat, isPct, isWS }) => (
          <div key={label}>
            <span className="text-slate-500">{label}:</span>{' '}
            <span className={`${isWS ? 'text-amber-400' : 'text-white'} font-medium`}>
              {isPct ? `${(stat.value * 100).toFixed(1)}%` : stat.value.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400/70 ml-1">#{stat.rank}</span>
          </div>
        ))}
      </div>

      {showAdvanced && (
        <div className="mt-3 p-2.5 bg-slate-800/60 rounded-lg text-xs">
          <div className="text-slate-500 mb-1.5 font-medium">Percentiles (vs 200 all-time greats)</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "PTS", pctl: stats.points.percentile },
              { label: "REB", pctl: stats.rebounds.percentile },
              { label: "AST", pctl: stats.assists.percentile },
              { label: "TS%", pctl: stats.ts_pct.percentile },
              { label: "WS", pctl: stats.win_shares.percentile },
              { label: "G", pctl: stats.games.percentile },
            ].map(({ label, pctl }) => (
              <div key={label}>
                {label}: <span className="text-amber-400">{pctl}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AllTimeRankingsPage() {
  const [phase, setPhase] = useState<GamePhase>("select");
  const [rankingSize, setRankingSize] = useState<RankingSize>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(true);

  // Game state
  const [rankingId, setRankingId] = useState<number | null>(null);
  const [currentMatchup, setCurrentMatchup] = useState<MatchupPlayer | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [matchupsCompleted, setMatchupsCompleted] = useState(0);
  const [totalMatchups, setTotalMatchups] = useState<number | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // Session ID for anonymous users
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem("alltime_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem("alltime_session_id", sessionId);
    }
    return sessionId;
  }, []);

  // Fetch available presets on mount
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await apiClient.get("/all-time/presets");
        setPresets(response.data.presets);
      } catch (err) {
        console.error("Failed to fetch presets:", err);
      } finally {
        setPresetsLoading(false);
      }
    };
    fetchPresets();
  }, []);

  const startRanking = async () => {
    setLoading(true);
    setError(null);

    try {
      const requestBody: { ranking_size: number; preset_id?: string } = {
        ranking_size: selectedPreset ? 0 : rankingSize,
      };

      if (selectedPreset) {
        requestBody.preset_id = selectedPreset;
      }

      const response = await apiClient.post("/all-time/start", requestBody, {
        headers: { "X-Session-Id": getSessionId() }
      });

      const data = response.data;
      setRankingId(data.ranking_id);
      setCurrentMatchup(data.first_matchup);
      setTotalMatchups(data.total_matchups);
      setMatchupsCompleted(0);
      setRankings([]);
      setPhase("playing");
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 404) {
        setError("API endpoint not found. The backend may not be configured correctly.");
      } else if (status === 502 || status === 503) {
        setError("Server is starting up. Please wait a moment and try again.");
      } else {
        setError(detail || `Failed to start ranking (${status || 'network error'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async (winnerId: string) => {
    if (!rankingId || !currentMatchup) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.put(`/all-time/${rankingId}/vote`, {
        winner_id: winnerId,
      }, {
        headers: { "X-Session-Id": getSessionId() }
      });

      const data = response.data;
      setMatchupsCompleted(data.matchups_completed);
      setRankings(data.current_rankings);

      if (data.is_complete) {
        setShareSlug(data.share_slug);
        setPhase("results");
      } else if (data.next_matchup) {
        setCurrentMatchup(data.next_matchup);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit vote");
    } finally {
      setLoading(false);
    }
  };

  const finishEarly = async () => {
    if (!rankingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post(`/all-time/${rankingId}/complete`, {
        generate_share_link: true,
      }, {
        headers: { "X-Session-Id": getSessionId() }
      });

      const data = response.data;
      setRankings(data.final_rankings);
      setShareSlug(data.share_slug);
      setPhase("results");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to complete ranking");
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setPhase("select");
    setRankingId(null);
    setCurrentMatchup(null);
    setRankings([]);
    setMatchupsCompleted(0);
    setTotalMatchups(null);
    setShareSlug(null);
    setError(null);
    setSelectedPreset(null);
    setShowStats(false);
    setShowAdvancedStats(false);
  };

  // Selection Phase UI
  const renderSelectionPhase = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 page-enter">
      <header className="text-center space-y-4 mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold">
          BUILD YOUR LIST
        </p>
        <h1 className="text-4xl font-black">All-Time Rankings</h1>
        <p className="text-slate-400 text-lg">
          Build your GOAT list by comparing players head-to-head
        </p>
      </header>

      <div className="space-y-6">
        {/* Preset Selection */}
        {!presetsLoading && presets.length > 0 && (
          <div className="card-elevated p-6">
            <h2 className="text-lg font-bold mb-2">Preset Rankings</h2>
            <p className="text-sm text-slate-500 mb-4">Choose a curated list of players</p>
            <div className="space-y-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(selectedPreset === preset.id ? null : preset.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPreset === preset.id
                      ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                      : "border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{preset.name}</div>
                      <div className="text-sm text-slate-500">{preset.description}</div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-amber-400 font-semibold">{preset.player_count} players</div>
                      <div className="text-xs text-slate-600">
                        {Math.round((preset.player_count * (preset.player_count - 1)) / 2).toLocaleString()} matchups
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {!presetsLoading && presets.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-800"></div>
            <span className="text-slate-600 text-xs uppercase tracking-wider">or choose a size</span>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>
        )}

        {/* Mode Selection */}
        <div className={`card-elevated p-6 ${selectedPreset ? 'opacity-40 pointer-events-none' : ''}`}>
          <h2 className="text-lg font-bold mb-4">Choose Your Challenge</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { size: 10, label: "Quick 10", desc: "45 matchups", time: "~5 min" },
              { size: 50, label: "Standard 50", desc: "1,225 matchups", time: "~30 min" },
              { size: 100, label: "Full 100", desc: "4,950 matchups", time: "~2 hrs" },
              { size: 0, label: "Infinite", desc: "Stop anytime", time: "Your pace" },
            ].map(({ size, label, desc, time }) => (
              <button
                key={size}
                onClick={() => { setRankingSize(size as RankingSize); setSelectedPreset(null); }}
                disabled={!!selectedPreset}
                className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left active:scale-[0.98] ${
                  rankingSize === size && !selectedPreset
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                    : "border-slate-700/50 hover:border-slate-600"
                }`}
                style={{ touchAction: "manipulation" }}
              >
                <div className="font-bold text-sm sm:text-base">{label}</div>
                <div className="text-xs sm:text-sm text-slate-500">{desc}</div>
                <div className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">{time}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="glass rounded-xl p-4 text-sm text-slate-500">
          <p className="mb-2">
            <strong className="text-slate-300">How it works:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Compare players head-to-head in matchups</li>
            <li>Your rankings update in real-time using Elo scoring</li>
            <li>Stop anytime to see your current rankings</li>
            <li>Share your final list with friends</li>
          </ul>
        </div>

        {/* Start Button */}
        <button
          onClick={startRanking}
          disabled={loading}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] ${
            selectedPreset
              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></span>
              Starting...
            </span>
          ) : selectedPreset ? (
            `Start ${presets.find(p => p.id === selectedPreset)?.name || 'Preset'} Ranking`
          ) : (
            `Start ${rankingSize === 0 ? "Infinite" : `Top ${rankingSize}`} Ranking`
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl text-sm">
            {error}
            <FeedbackLink variant="compact" className="mt-2 block" />
          </div>
        )}
      </div>
    </div>
  );

  // Playing Phase UI
  const renderPlayingPhase = () => {
    if (!currentMatchup) return null;

    const progress = totalMatchups
      ? Math.round((matchupsCompleted / totalMatchups) * 100)
      : null;

    return (
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {/* Progress Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 gap-2">
            <button
              onClick={finishEarly}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm glass-hover rounded-lg font-medium text-slate-300"
            >
              Finish
            </button>
            <div className="text-xs sm:text-sm text-slate-500 text-center">
              {matchupsCompleted}{totalMatchups ? ` / ${totalMatchups}` : ""} done
            </div>
            <button
              onClick={startOver}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-500 hover:text-slate-300 transition"
            >
              Restart
            </button>
          </div>
          {progress !== null && (
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Matchup View */}
        <div className="card-elevated p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-300">
              Who's the better player all-time?
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  showStats
                    ? 'bg-amber-500 text-black'
                    : 'glass text-slate-400 hover:text-slate-200'
                }`}
              >
                {showStats ? 'Hide Stats' : 'See Stats'}
              </button>
              {showStats && (
                <button
                  onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                  className={`px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    showAdvancedStats
                      ? 'bg-purple-500 text-white'
                      : 'glass text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {showAdvancedStats ? 'Basic' : 'Advanced'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Player 1 */}
            <button
              onClick={() => submitVote(currentMatchup.player1_id)}
              disabled={loading}
              className="p-4 sm:p-6 rounded-2xl bg-slate-700/30 hover:bg-emerald-600/10 hover:border-emerald-500/50 border-2 border-transparent transition-all group disabled:opacity-50 active:scale-[0.98]"
              style={{ touchAction: "manipulation" }}
            >
              <div className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-0">
                <img
                  src={getPlayerImageUrlWithFallback(currentMatchup.player1_name, currentMatchup.player1_id)}
                  alt={currentMatchup.player1_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 sm:mx-auto sm:mb-3 rounded-full object-cover bg-slate-600/50 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0 text-left sm:text-center">
                  <div className="text-lg sm:text-xl font-bold mb-0.5 sm:mb-1 group-hover:text-emerald-400 transition truncate">
                    {currentMatchup.player1_name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {currentMatchup.player1_team || "—"}
                    <span className="sm:hidden"> · {currentMatchup.player1_position || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 hidden sm:block">
                    {currentMatchup.player1_position || "—"}
                  </div>
                </div>
              </div>

              {showStats && currentMatchup.player1_stats && (
                <PlayerStatGrid stats={currentMatchup.player1_stats} showAdvanced={showAdvancedStats} />
              )}
            </button>

            {/* Mobile VS indicator */}
            <div className="flex sm:hidden justify-center -my-1 relative z-10">
              <div className="vs-badge-mobile">VS</div>
            </div>

            {/* Player 2 */}
            <button
              onClick={() => submitVote(currentMatchup.player2_id)}
              disabled={loading}
              className="p-4 sm:p-6 rounded-2xl bg-slate-700/30 hover:bg-emerald-600/10 hover:border-emerald-500/50 border-2 border-transparent transition-all group disabled:opacity-50 active:scale-[0.98]"
              style={{ touchAction: "manipulation" }}
            >
              <div className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-0">
                <img
                  src={getPlayerImageUrlWithFallback(currentMatchup.player2_name, currentMatchup.player2_id)}
                  alt={currentMatchup.player2_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 sm:mx-auto sm:mb-3 rounded-full object-cover bg-slate-600/50 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0 text-left sm:text-center">
                  <div className="text-lg sm:text-xl font-bold mb-0.5 sm:mb-1 group-hover:text-emerald-400 transition truncate">
                    {currentMatchup.player2_name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {currentMatchup.player2_team || "—"}
                    <span className="sm:hidden"> · {currentMatchup.player2_position || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 hidden sm:block">
                    {currentMatchup.player2_position || "—"}
                  </div>
                </div>
              </div>

              {showStats && currentMatchup.player2_stats && (
                <PlayerStatGrid stats={currentMatchup.player2_stats} showAdvanced={showAdvancedStats} />
              )}
            </button>
          </div>

          {loading && (
            <div className="text-center mt-4">
              <span className="text-sm text-slate-500 animate-pulse">Processing...</span>
            </div>
          )}
        </div>

        {/* Live Rankings Sidebar */}
        {rankings.length > 0 && (
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-slate-400 uppercase tracking-wider">
              Current Rankings
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {rankings.slice(0, 10).map((entry) => (
                <div
                  key={entry.player_id}
                  className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-sm text-emerald-400">
                      #{entry.rank}
                    </span>
                    <span className="text-sm">{entry.player_name}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.wins}-{entry.losses}
                  </div>
                </div>
              ))}
              {rankings.length > 10 && (
                <div className="text-center text-xs text-slate-600 pt-2">
                  +{rankings.length - 10} more...
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl text-sm">
            {error}
            <FeedbackLink variant="compact" className="mt-2 block" />
          </div>
        )}
      </div>
    );
  };

  // Results Phase UI
  const renderResultsPhase = () => (
    <div className="max-w-3xl mx-auto px-4 py-8 page-enter">
      <header className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black">Your All-Time Rankings</h1>
        <p className="text-slate-500 text-sm">
          Based on {matchupsCompleted} head-to-head comparisons
        </p>
      </header>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={() => setShowShareModal(true)}
          className="btn-primary"
        >
          Share Rankings
        </button>
        <button
          onClick={startOver}
          className="btn-secondary"
        >
          New Ranking
        </button>
      </div>

      {/* Rankings List */}
      <div className="card-elevated p-6">
        <div className="space-y-2">
          {rankings.map((entry, idx) => (
            <div
              key={entry.player_id}
              className={`flex items-center gap-4 p-3 rounded-xl transition ${
                idx < 3
                  ? "bg-gradient-to-r from-amber-900/20 to-transparent border border-amber-700/20"
                  : "bg-slate-700/20"
              }`}
            >
              <span
                className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm ${
                  idx === 0
                    ? "bg-yellow-500 text-black"
                    : idx === 1
                    ? "bg-slate-400 text-black"
                    : idx === 2
                    ? "bg-amber-600 text-black"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{entry.player_name}</div>
                <div className="text-xs text-slate-500">
                  {entry.team || "—"} · {entry.position || "—"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-emerald-400 text-sm">
                  {Math.round(entry.score)}
                </div>
                <div className="text-[10px] text-slate-600">
                  {entry.wins}W-{entry.losses}L
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && rankings.length > 0 && (
        <SocialGraphicGenerator
          players={rankings.slice(0, Math.min(rankings.length, 15)).map((r) => ({
            name: r.player_name,
            team: r.team,
            position: r.position,
            jerseyNumber: r.jersey_number,
          }))}
          title="My All-Time GOAT List"
          subtitle={`Top ${Math.min(rankings.length, 15)} Players`}
          onClose={() => setShowShareModal(false)}
          style="rushmore"
        />
      )}

      {shareSlug && (
        <p className="text-center text-xs text-slate-600 mt-4">
          Share link available
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      {phase === "select" && renderSelectionPhase()}
      {phase === "playing" && renderPlayingPhase()}
      {phase === "results" && renderResultsPhase()}
    </div>
  );
}
