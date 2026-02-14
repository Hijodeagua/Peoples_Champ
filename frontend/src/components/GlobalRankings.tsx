import { useEffect, useState } from "react";
import { getGlobalRankings, type GlobalRankingsResponse, type PlayerRanking } from "../api/voting";
import { getPlayerThumbnailUrl } from "../utils/playerImages";
import SocialGraphicGenerator from "./SocialGraphicGenerator";
import { trackViewRankings } from "../utils/analytics";

interface GlobalRankingsProps {
  onPlayGame?: () => void;
}

export default function GlobalRankings({ onPlayGame }: GlobalRankingsProps) {
  const [data, setData] = useState<GlobalRankingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [skippedModal, setSkippedModal] = useState(false);

  useEffect(() => {
    const loadRankings = async () => {
      try {
        setLoading(true);
        const response = await getGlobalRankings();
        setData(response);
        if (response.total_voters > 0) {
          trackViewRankings(response.total_voters);
        }
      } catch (err) {
        console.error("Failed to load rankings:", err);
        setError("Failed to load rankings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    loadRankings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-amber-500 mx-auto"></div>
          <p className="text-sm text-slate-500">Loading today's rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-elevated p-6 max-w-md mx-auto text-center">
        <p className="font-semibold text-slate-200 mb-2">Error</p>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-secondary text-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.rankings || data.rankings.length === 0) {
    if (!skippedModal) {
      return (
        <div className="card-elevated p-8 max-w-md mx-auto text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">No Rankings Yet</h2>
          <p className="text-slate-400 text-sm mb-6">
            Play today's matchups first to see the global rankings!
          </p>
          <div className="flex flex-col gap-3">
            {onPlayGame && (
              <button onClick={onPlayGame} className="btn-primary">
                Play Today's Matchups
              </button>
            )}
            <button
              onClick={() => setSkippedModal(true)}
              className="text-sm text-slate-500 hover:text-slate-300 transition"
            >
              Show rankings anyway
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="card-elevated p-8 max-w-md mx-auto text-center">
        <p className="text-slate-500">No rankings available yet for today.</p>
      </div>
    );
  }

  const topPlayers = data.rankings.slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Summary Bar */}
      <div className="glass rounded-xl p-3 sm:p-4 text-center">
        <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
          <div>
            <span className="text-slate-500">Date: </span>
            <span className="text-slate-200 font-medium">{data.date}</span>
          </div>
          <div>
            <span className="text-slate-500">Voters: </span>
            <span className="text-emerald-400 font-semibold">{data.total_voters}</span>
          </div>
          <div>
            <span className="text-slate-500">Votes: </span>
            <span className="text-amber-400 font-semibold">{data.total_votes}</span>
          </div>
        </div>
      </div>

      {/* Podium - Top 3 */}
      {data.rankings.length >= 3 && (
        <div className="flex items-end justify-center gap-2 sm:gap-4 py-4 sm:py-6">
          <PodiumEntry ranking={data.rankings[1]} position={2} />
          <PodiumEntry ranking={data.rankings[0]} position={1} />
          <PodiumEntry ranking={data.rankings[2]} position={3} />
        </div>
      )}

      {/* Full Rankings Table */}
      <div className="card-elevated overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base text-slate-300">Today's Rankings</h3>
            <button
              onClick={() => setShowShareModal(true)}
              className="px-3 sm:px-4 py-1.5 text-xs font-semibold glass-hover rounded-lg text-slate-300"
            >
              Share
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-700/30">
          {data.rankings.map((ranking, idx) => (
            <div
              key={ranking.id}
              className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-700/20 transition"
            >
              <span
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg font-bold text-xs shrink-0 ${
                  idx === 0
                    ? "bg-yellow-500 text-black"
                    : idx === 1
                    ? "bg-slate-400 text-black"
                    : idx === 2
                    ? "bg-amber-600 text-black"
                    : "bg-slate-700/50 text-slate-400"
                }`}
              >
                {idx + 1}
              </span>

              <img
                src={getPlayerThumbnailUrl(ranking.name)}
                alt={ranking.name}
                className="w-8 h-7 sm:w-10 sm:h-8 object-cover rounded bg-slate-700/50 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs sm:text-sm truncate">{ranking.name}</div>
                <div className="text-[10px] sm:text-xs text-slate-500">
                  {ranking.team || "---"} {ranking.position && `· ${ranking.position}`}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-bold text-emerald-400">
                  {ranking.win_percentage.toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-600">
                  {ranking.wins}W-{ranking.total_matchups - ranking.wins}L
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && topPlayers.length > 0 && (
        <SocialGraphicGenerator
          players={topPlayers.map((r) => ({
            name: r.name,
            team: r.team,
            position: r.position,
          }))}
          title="Today's People's Rankings"
          subtitle={data.date}
          onClose={() => setShowShareModal(false)}
          style="podium"
        />
      )}
    </div>
  );
}

function PodiumEntry({ ranking, position }: { ranking: PlayerRanking; position: 1 | 2 | 3 }) {
  const heights = { 1: "h-24 sm:h-28", 2: "h-16 sm:h-20", 3: "h-12 sm:h-16" };
  const colors = {
    1: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/30",
    2: "from-slate-400/20 to-slate-500/5 border-slate-400/30",
    3: "from-amber-600/20 to-amber-700/5 border-amber-600/30",
  };
  const badgeColors = {
    1: "bg-yellow-500 text-black",
    2: "bg-slate-400 text-black",
    3: "bg-amber-600 text-black",
  };

  return (
    <div className={`flex flex-col items-center ${position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3'}`}>
      <img
        src={getPlayerThumbnailUrl(ranking.name)}
        alt={ranking.name}
        className="w-12 h-10 sm:w-14 sm:h-12 object-cover rounded-xl bg-slate-700/50 mb-1.5 sm:mb-2"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold mb-1.5 sm:mb-2 ${badgeColors[position]}`}>
        {position}
      </span>
      <div className="text-center mb-1.5 sm:mb-2">
        <div className="font-bold text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{ranking.name}</div>
        <div className="text-[9px] sm:text-[10px] text-slate-500">{ranking.win_percentage.toFixed(0)}% wins</div>
      </div>
      <div className={`w-20 sm:w-24 ${heights[position]} rounded-t-xl bg-gradient-to-t ${colors[position]} border-t border-x`} />
    </div>
  );
}
