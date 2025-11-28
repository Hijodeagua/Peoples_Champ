import { useEffect, useState } from "react";
import { loadPlayers } from "../data/loadPlayersFromCSV";
import { loadRingerRankings } from "../data/loadRingerRankings";
import { generateRankings } from "../data/rankingModel";
import type { PlayerRanking } from "../data/rankingModel";

export default function PeoplesRankingsPage() {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRankings() {
      try {
        setLoading(true);
        const [players, ringerRankings] = await Promise.all([
          loadPlayers(),
          loadRingerRankings(),
        ]);

        const playerRankings = generateRankings(players, ringerRankings);
        setRankings(playerRankings.slice(0, 50)); // Show top 50
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rankings");
      } finally {
        setLoading(false);
      }
    }

    loadRankings();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-xl text-slate-300">Loading rankings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-6 rounded-xl text-center">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="text-center space-y-3 mb-8">
        <h1 className="text-4xl font-bold">Peoples Rankings</h1>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Rankings based on internal ELO calculations and aggregate user choices from the daily game.
        </p>
      </header>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>Model-Based Rankings:</strong> These rankings are calculated using advanced
            statistics from Basketball Reference (Win Shares, BPM, VORP, PER). Compare with The
            Ringer's expert rankings to see where our model agrees and disagrees.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Our Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Player</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Team</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Ringer Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Diff</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((ranking) => (
                <tr key={ranking.player.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4 text-emerald-400 font-bold">#{ranking.rank}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">{ranking.player.name}</div>
                    <div className="text-xs text-slate-400">{ranking.player.season}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{ranking.player.team}</td>
                  <td className="py-3 px-4 text-slate-300">{ranking.compositeScore.toFixed(1)}</td>
                  <td className="py-3 px-4 text-slate-300">
                    {ranking.ringerRank ? `#${ranking.ringerRank}` : "—"}
                  </td>
                  <td className="py-3 px-4">
                    {ranking.rankDifference !== null ? (
                      <span
                        className={`text-sm font-medium ${
                          ranking.rankDifference < 0
                            ? "text-green-400"
                            : ranking.rankDifference > 0
                            ? "text-red-400"
                            : "text-slate-400"
                        }`}
                      >
                        {ranking.rankDifference > 0 ? "+" : ""}
                        {ranking.rankDifference}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-2 text-center text-sm text-slate-400">
          <p>
            <strong>Diff:</strong> Negative = we rank higher than Ringer, Positive = we rank lower
          </p>
          <p>Rankings based on Win Shares and other advanced metrics from Basketball Reference.</p>
        </div>
      </div>
    </div>
  );
}
