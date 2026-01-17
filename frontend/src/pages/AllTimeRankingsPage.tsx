import { useState, useCallback } from "react";
import SocialGraphicGenerator from "../components/SocialGraphicGenerator";
import apiClient from "../api/client";

type RankingSize = 10 | 50 | 100 | 0; // 0 = infinite

interface MatchupPlayer {
  player1_id: string;
  player1_name: string;
  player1_team: string | null;
  player1_position: string | null;
  player2_id: string;
  player2_name: string;
  player2_team: string | null;
  player2_position: string | null;
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
}

type GamePhase = "select" | "playing" | "results";

export default function AllTimeRankingsPage() {
  const [phase, setPhase] = useState<GamePhase>("select");
  const [rankingSize, setRankingSize] = useState<RankingSize>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [rankingId, setRankingId] = useState<number | null>(null);
  const [currentMatchup, setCurrentMatchup] = useState<MatchupPlayer | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [matchupsCompleted, setMatchupsCompleted] = useState(0);
  const [totalMatchups, setTotalMatchups] = useState<number | null>(null);
  const [_shareSlug, setShareSlug] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Session ID for anonymous users
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem("alltime_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("alltime_session_id", sessionId);
    }
    return sessionId;
  }, []);

  const startRanking = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/all-time/start", {
        ranking_size: rankingSize,
      }, {
        headers: {
          "X-Session-Id": getSessionId(),
        }
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
        setError("Server is starting up. Please wait 30 seconds and try again.");
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
        headers: {
          "X-Session-Id": getSessionId(),
        }
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
        headers: {
          "X-Session-Id": getSessionId(),
        }
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
  };

  // Selection Phase UI
  const renderSelectionPhase = () => (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="text-center space-y-4 mb-10">
        <h1 className="text-4xl font-bold">All-Time Rankings</h1>
        <p className="text-slate-300 text-lg">
          Build your GOAT list by comparing players head-to-head
        </p>
      </header>

      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold mb-4">Choose Your Challenge</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { size: 10, label: "Quick 10", desc: "45 matchups", time: "~5 min" },
              { size: 50, label: "Standard 50", desc: "1,225 matchups", time: "~30 min" },
              { size: 100, label: "Full 100", desc: "4,950 matchups", time: "~2 hrs" },
              { size: 0, label: "Infinite", desc: "Stop anytime", time: "Your pace" },
            ].map(({ size, label, desc, time }) => (
              <button
                key={size}
                onClick={() => setRankingSize(size as RankingSize)}
                className={`p-4 rounded-lg border-2 transition text-left ${
                  rankingSize === size
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                <div className="font-bold text-lg">{label}</div>
                <div className="text-sm text-slate-400">{desc}</div>
                <div className="text-xs text-slate-500 mt-1">{time}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-slate-800/30 rounded-lg p-4 text-sm text-slate-400">
          <p className="mb-2">
            <strong className="text-slate-300">How it works:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
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
          className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Starting...
            </span>
          ) : (
            `Start ${rankingSize === 0 ? "Infinite" : `Top ${rankingSize}`} Ranking`
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-900/40 border border-red-700 text-red-200 rounded-lg text-sm">
            {error}
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={finishEarly}
              className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition"
            >
              I'm Done - See Rankings
            </button>
            <div className="text-slate-400">
              {matchupsCompleted} matchups completed
              {totalMatchups && ` / ${totalMatchups}`}
            </div>
            <button
              onClick={startOver}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
            >
              Start Over
            </button>
          </div>
          {progress !== null && (
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Matchup View */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
          <h2 className="text-center text-xl font-bold mb-6 text-slate-300">
            Who's the better player all-time?
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 */}
            <button
              onClick={() => submitVote(currentMatchup.player1_id)}
              disabled={loading}
              className="p-6 rounded-xl bg-slate-700/50 hover:bg-emerald-600/20 hover:border-emerald-500 border-2 border-transparent transition group disabled:opacity-50"
            >
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 group-hover:text-emerald-400 transition">
                  {currentMatchup.player1_name}
                </div>
                <div className="text-slate-400">
                  {currentMatchup.player1_team || "—"}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {currentMatchup.player1_position || "—"}
                </div>
              </div>
            </button>

            {/* Player 2 */}
            <button
              onClick={() => submitVote(currentMatchup.player2_id)}
              disabled={loading}
              className="p-6 rounded-xl bg-slate-700/50 hover:bg-emerald-600/20 hover:border-emerald-500 border-2 border-transparent transition group disabled:opacity-50"
            >
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 group-hover:text-emerald-400 transition">
                  {currentMatchup.player2_name}
                </div>
                <div className="text-slate-400">
                  {currentMatchup.player2_team || "—"}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {currentMatchup.player2_position || "—"}
                </div>
              </div>
            </button>
          </div>

          {loading && (
            <div className="text-center mt-4 text-slate-400">
              <span className="animate-pulse">Processing...</span>
            </div>
          )}
        </div>

        {/* Live Rankings Sidebar */}
        {rankings.length > 0 && (
          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4">
            <h3 className="text-lg font-semibold mb-3 text-slate-300">
              Current Rankings
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {rankings.slice(0, 10).map((entry) => (
                <div
                  key={entry.player_id}
                  className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-emerald-400">
                      #{entry.rank}
                    </span>
                    <span>{entry.player_name}</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    {entry.wins}-{entry.losses}
                  </div>
                </div>
              ))}
              {rankings.length > 10 && (
                <div className="text-center text-sm text-slate-500 pt-2">
                  +{rankings.length - 10} more...
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-700 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    );
  };

  // Results Phase UI
  const renderResultsPhase = () => (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="text-center space-y-4 mb-8">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-4xl font-bold">Your All-Time Rankings</h1>
        <p className="text-slate-400">
          Based on {matchupsCompleted} head-to-head comparisons
        </p>
      </header>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setShowShareModal(true)}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition"
        >
          Share Rankings 📤
        </button>
        <button
          onClick={startOver}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
        >
          Start New Ranking
        </button>
      </div>

      {/* Rankings List */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="space-y-3">
          {rankings.map((entry, idx) => (
            <div
              key={entry.player_id}
              className={`flex items-center gap-4 p-4 rounded-lg transition ${
                idx < 3
                  ? "bg-gradient-to-r from-yellow-900/30 to-transparent border border-yellow-600/30"
                  : "bg-slate-700/30"
              }`}
            >
              <span
                className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                  idx === 0
                    ? "bg-yellow-500 text-black"
                    : idx === 1
                    ? "bg-slate-400 text-black"
                    : idx === 2
                    ? "bg-amber-600 text-black"
                    : "bg-slate-600 text-white"
                }`}
              >
                {entry.rank}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-lg">{entry.player_name}</div>
                <div className="text-sm text-slate-400">
                  {entry.team || "—"} • {entry.position || "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-400">
                  {Math.round(entry.score)}
                </div>
                <div className="text-xs text-slate-500">
                  {entry.wins}W - {entry.losses}L
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
          }))}
          title="My All-Time GOAT List"
          subtitle={`Top ${Math.min(rankings.length, 15)} Players`}
          onClose={() => setShowShareModal(false)}
        />
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
