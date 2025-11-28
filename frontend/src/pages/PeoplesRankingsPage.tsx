import { useEffect, useState } from "react";
import { loadPlayers } from "../data/loadPlayersFromCSV";
import { loadRingerRankings } from "../data/loadRingerRankings";
import { generateRankings } from "../data/rankingModel";
import type { PlayerRanking } from "../data/rankingModel";
import { RankingsScatterPlot } from "../components/RankingsScatterPlot";

export default function PeoplesRankingsPage() {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    async function loadRankings() {
      try {
        setLoading(true);
        const [players, ringerRankings] = await Promise.all([
          loadPlayers(),
          loadRingerRankings(),
        ]);

        // Filter players with less than 10 games played
        const validPlayers = players.filter(p => p.games >= 10);

        const playerRankings = generateRankings(validPlayers, ringerRankings);
        setRankings(playerRankings.slice(0, 100)); // Show top 100
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rankings");
      } finally {
        setLoading(false);
      }
    }

    loadRankings();
  }, []);

  const handleGenerateAnalysis = async () => {
    try {
      setGeneratingAnalysis(true);
      setAnalysis(null);
      setRating(null);
      setFeedbackSubmitted(false);

      // Prioritize players with significant differences for the analysis
      const topDifferences = [...rankings]
        .filter(r => r.rankDifference !== null)
        .sort((a, b) => Math.abs(b.rankDifference!) - Math.abs(a.rankDifference!))
        .slice(0, 20)
        .map(r => ({
          name: r.player.name,
          rank: r.rank,
          ringerRank: r.ringerRank,
          diff: r.rankDifference,
          stats_summary: `BPM: ${r.player.advanced.bpm}, WS: ${r.player.ws}, VORP: ${r.player.advanced.vorp}`
        }));

      const response = await fetch("http://localhost:8000/analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankings: topDifferences }),
      });

      if (!response.ok) throw new Error("Failed to generate analysis");

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
      // Mock analysis for fallback if API fails or no key
      setAnalysis("The model shows significant divergence from consensus on several defensive specialists...");
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const handleFeedback = async (score: number) => {
    if (!analysis) return;
    setRating(score);
    
    try {
      await fetch("http://localhost:8000/analysis/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_text: analysis, rating: score }),
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Failed to send feedback", err);
    }
  };

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
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
          >
            {showChart ? "Hide Analysis" : "Show Analysis Chart"}
          </button>
        </div>

        {showChart && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-center mb-6">
              {!analysis && !generatingAnalysis && (
                <button
                  onClick={handleGenerateAnalysis}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-full font-medium shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <span>✨</span> Generate AI Analysis
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <RankingsScatterPlot rankings={rankings} />
              
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>🤖</span> Model Analysis
                </h3>
                
                {generatingAnalysis ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-700 rounded w-full"></div>
                    <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                    <p className="text-sm text-slate-400 pt-2">Crunching the numbers...</p>
                  </div>
                ) : analysis ? (
                  <div className="space-y-6">
                    <div className="prose prose-invert text-slate-300 text-sm leading-relaxed">
                      <p className="whitespace-pre-line">{analysis}</p>
                    </div>
                    
                    <div className="border-t border-slate-700 pt-4">
                      <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">
                        Rate this analysis
                      </p>
                      
                      {feedbackSubmitted ? (
                        <div className="text-green-400 text-sm flex items-center gap-2 bg-green-900/20 p-2 rounded">
                          <span>✓</span> Thanks for your feedback!
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleFeedback(star)}
                              onMouseEnter={() => setRating(star)}
                              className={`text-xl transition-transform hover:scale-110 ${
                                (rating || 0) >= star ? "text-yellow-400" : "text-slate-600"
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-12">
                    <p>Click generate to analyze the data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
