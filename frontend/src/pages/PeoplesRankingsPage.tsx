import { useEffect, useState } from "react";
import { loadPlayers } from "../data/loadPlayersFromCSV";
import { loadRingerRankings } from "../data/loadRingerRankings";
import { generateRankings } from "../data/rankingModel";
import type { PlayerRanking } from "../data/rankingModel";
import { RankingsScatterPlot } from "../components/RankingsScatterPlot";
import { getAllTimeVotes, type AllTimePlayerStats } from "../api/voting";
import { getPlayerThumbnailUrl } from "../utils/playerImages";
import { simulateAllH2HMatchups, generateComparisonAnalyses, type SimulatedH2HResult, type ComparisonAnalysis } from "../data/simulateH2H";
import { hasPlayerImage } from "../utils/playerImages";

export default function PeoplesRankingsPage() {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [h2hVotes, setH2hVotes] = useState<Map<string, AllTimePlayerStats>>(new Map());
  const [simulatedH2H, setSimulatedH2H] = useState<Map<string, SimulatedH2HResult>>(new Map());
  const [comparisonAnalyses, setComparisonAnalyses] = useState<ComparisonAnalysis[]>([]);
  const [useSimulated, setUseSimulated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [primaryRanking, setPrimaryRanking] = useState<'h2h' | 'elo' | 'ringer'>('h2h');
  const [chartXAxis, setChartXAxis] = useState<'h2h' | 'elo' | 'ringer'>('ringer');
  const [chartYAxis, setChartYAxis] = useState<'h2h' | 'elo' | 'ringer'>('h2h');

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
        const top100 = playerRankings.slice(0, 100);
        setRankings(top100);
        
        // Log missing headshots to console for debugging
        const missingHeadshots = top100.filter(r => !hasPlayerImage(r.player.name));
        if (missingHeadshots.length > 0) {
          console.log('=== MISSING HEADSHOTS ===');
          console.log(`${missingHeadshots.length} of ${top100.length} players missing headshots:`);
          missingHeadshots.forEach(r => console.log(`  "${r.player.name}",`));
        }
        
        // Generate simulated H2H results
        const simResults = simulateAllH2HMatchups(top100, 100);
        setSimulatedH2H(simResults);
        
        // Generate comparison analyses for the 3 scenarios
        const analyses = generateComparisonAnalyses(top100, simResults);
        setComparisonAnalyses(analyses);
        
        // Try to load real H2H votes from backend (non-blocking)
        try {
          const votesData = await getAllTimeVotes();
          const votesMap = new Map<string, AllTimePlayerStats>();
          let totalVotes = 0;
          for (const player of votesData.players) {
            votesMap.set(player.id, player);
            totalVotes += player.total_matchups;
          }
          setH2hVotes(votesMap);
          
          // Check if we have enough real votes (avg 10 per player)
          const avgVotesPerPlayer = votesMap.size > 0 ? totalVotes / votesMap.size : 0;
          if (avgVotesPerPlayer >= 10) {
            setUseSimulated(false);
          }
        } catch (votesErr) {
          console.warn("Could not load H2H votes, using simulated data:", votesErr);
          // Keep using simulated data
        }
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

      // Build analysis data including H2H ranks from simulation
      const topDifferences = [...rankings]
        .filter(r => r.rankDifference !== null)
        .sort((a, b) => Math.abs(b.rankDifference!) - Math.abs(a.rankDifference!))
        .slice(0, 20)
        .map(r => {
          const h2hData = simulatedH2H.get(r.player.id);
          return {
            name: r.player.name,
            rank: r.rank,
            ringerRank: r.ringerRank,
            h2hRank: h2hData?.h2hRank ?? null,
            diff: r.rankDifference,
            stats_summary: `BPM: ${r.player.advanced.bpm}, WS: ${r.player.ws}, VORP: ${r.player.advanced.vorp}`
          };
        });

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/analysis/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rankings: topDifferences,
          comparison_type: "elo_vs_ringer"
        }),
      });

      if (!response.ok) throw new Error("Failed to generate analysis");

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
      // Generate fallback from comparison analyses
      if (comparisonAnalyses.length > 0) {
        const ca = comparisonAnalyses[0];
        setAnalysis(`• Undervalued: ${ca.biggestUndervalued.slice(0, 2).map(p => p.name).join(', ')}
• Overvalued: ${ca.biggestOvervalued.slice(0, 2).map(p => p.name).join(', ')}
• Correlation between rankings: ${(ca.correlation * 100).toFixed(1)}%`);
      } else {
        setAnalysis("Unable to generate analysis. Please try again.");
      }
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const handleFeedback = async (score: number) => {
    if (!analysis) return;
    setRating(score);
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/analysis/feedback`, {
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
      <div className="max-w-6xl mx-auto px-4 py-16 text-center page-enter">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-emerald-500 mx-auto mb-4"></div>
        <p className="text-sm text-slate-500">Loading rankings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="card-elevated p-6 max-w-md mx-auto text-center">
          <p className="font-semibold text-slate-200 mb-2">Error Loading Rankings</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 page-enter">
      <header className="text-center space-y-3 mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 font-semibold">
          CROWD CONSENSUS
        </p>
        <h1 className="text-4xl font-bold">People&apos;s Rankings</h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm">
          Rankings based on simulated head-to-head matchups blending analytics and expert opinion.
        </p>
        
        {/* Ranking View Toggle */}
        <div className="flex justify-center gap-2 pt-4">
          <span className="text-sm text-slate-400 mr-2">Sort by:</span>
          {(['h2h', 'elo', 'ringer'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPrimaryRanking(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                primaryRanking === type
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {type === 'h2h' ? "People's Score" : type === 'elo' ? 'ELO Model' : 'Ringer'}
            </button>
          ))}
        </div>
      </header>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
          >
            {showChart ? "Hide Chart" : "Plot the Differences"}
          </button>
        </div>

        {showChart && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Centered Scatter Plot */}
            <div className="flex justify-center mb-6">
              <RankingsScatterPlot 
                rankings={rankings} 
                h2hVotes={h2hVotes} 
                simulatedH2H={simulatedH2H}
                useSimulated={useSimulated}
                onAxisChange={(x: 'h2h' | 'elo' | 'ringer', y: 'h2h' | 'elo' | 'ringer') => {
                  setChartXAxis(x);
                  setChartYAxis(y);
                }}
              />
            </div>
            
            {/* Analysis Section */}
            <div className="max-w-2xl mx-auto bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span>🤖</span> Analysis
                </h3>
                {!generatingAnalysis && (
                  <button
                    onClick={handleGenerateAnalysis}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-transform active:scale-95 flex items-center gap-2"
                  >
                    <span>✨</span> {analysis ? 'Regenerate' : 'Generate'}
                  </button>
                )}
              </div>
              
              {/* Show analysis for current chart axes */}
              {(() => {
                const getScenarioKey = () => {
                  if ((chartXAxis === 'h2h' && chartYAxis === 'elo') || (chartXAxis === 'elo' && chartYAxis === 'h2h')) return 'h2h_vs_elo';
                  if ((chartXAxis === 'h2h' && chartYAxis === 'ringer') || (chartXAxis === 'ringer' && chartYAxis === 'h2h')) return 'h2h_vs_ringer';
                  return 'elo_vs_ringer';
                };
                const currentAnalysis = comparisonAnalyses.find(ca => ca.scenario === getScenarioKey());
                
                if (!currentAnalysis) return null;
                
                return (
                  <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-200 mb-3">{currentAnalysis.title}</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                      <div>
                        <p className="text-emerald-400 font-medium mb-2">Undervalued Players</p>
                        {currentAnalysis.biggestUndervalued.slice(0, 3).map((p, i) => (
                          <div key={i} className="text-slate-300 mb-2 p-2 bg-slate-900/50 rounded">
                            <div className="font-medium">{p.name} <span className="text-slate-500">({p.team})</span></div>
                            <div className="text-slate-400 mt-1">
                              Diff: <span className="text-emerald-400">{p.diff > 0 ? '+' : ''}{p.diff}</span>
                              {' • '}BPM: {p.bpm.toFixed(1)}
                              {' • '}WS: {p.ws.toFixed(1)}
                            </div>
                          </div>
                        ))}
                        <p className="text-slate-500 mt-2">
                          Avg BPM: {currentAnalysis.avgBpmUndervalued.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-red-400 font-medium mb-2">Overvalued Players</p>
                        {currentAnalysis.biggestOvervalued.slice(0, 3).map((p, i) => (
                          <div key={i} className="text-slate-300 mb-2 p-2 bg-slate-900/50 rounded">
                            <div className="font-medium">{p.name} <span className="text-slate-500">({p.team})</span></div>
                            <div className="text-slate-400 mt-1">
                              Diff: <span className="text-red-400">{p.diff > 0 ? '+' : ''}{p.diff}</span>
                              {' • '}BPM: {p.bpm.toFixed(1)}
                              {' • '}WS: {p.ws.toFixed(1)}
                            </div>
                          </div>
                        ))}
                        <p className="text-slate-500 mt-2">
                          Avg BPM: {currentAnalysis.avgBpmOvervalued.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Top Performers */}
                    <div className="border-t border-slate-700 pt-3 mt-3">
                      <p className="text-slate-400 font-medium mb-2 text-xs">Top 5 in this ranking:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentAnalysis.topPerformers.map((p, i) => (
                          <span key={i} className="text-xs bg-slate-700 px-2 py-1 rounded">
                            #{p.rank} {p.name} <span className="text-slate-400">(BPM: {p.bpm.toFixed(1)})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-slate-500 text-xs mt-3">
                      Correlation: {(currentAnalysis.correlation * 100).toFixed(1)}%
                    </p>
                  </div>
                );
              })()}

              {/* AI-generated analysis */}
              {generatingAnalysis ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-full"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                  <p className="text-sm text-slate-400 pt-2">Generating insights...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-4">
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
              ) : null}
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                  {primaryRanking === 'h2h' ? "People's Rank" : primaryRanking === 'ringer' ? 'Ringer Rank' : 'ELO Rank'}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Player</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Team</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">ELO Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">H2H Record</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Ringer</th>
              </tr>
            </thead>
            <tbody>
              {[...rankings]
                .sort((a, b) => {
                  if (primaryRanking === 'h2h') {
                    const aH2H = simulatedH2H.get(a.player.id)?.h2hRank ?? 999;
                    const bH2H = simulatedH2H.get(b.player.id)?.h2hRank ?? 999;
                    return aH2H - bH2H;
                  } else if (primaryRanking === 'ringer') {
                    const aRinger = a.ringerRank ?? 999;
                    const bRinger = b.ringerRank ?? 999;
                    return aRinger - bRinger;
                  }
                  return a.rank - b.rank; // ELO
                })
                .map((ranking, sortedIndex) => {
                const realVotes = h2hVotes.get(ranking.player.id);
                const simVotes = simulatedH2H.get(ranking.player.id);
                // Use real votes if available and we have enough data, otherwise use simulated
                const displayVotes = !useSimulated && realVotes ? {
                  wins: realVotes.h2h_wins,
                  losses: realVotes.total_matchups - realVotes.h2h_wins,
                  h2hRank: null as number | null,
                } : simVotes ? {
                  wins: simVotes.wins,
                  losses: simVotes.losses,
                  h2hRank: simVotes.h2hRank,
                } : null;
                
                // Get the display rank based on primary ranking
                const displayRank = primaryRanking === 'h2h' 
                  ? (displayVotes?.h2hRank ?? sortedIndex + 1)
                  : primaryRanking === 'ringer'
                  ? (ranking.ringerRank ?? sortedIndex + 1)
                  : ranking.rank;
                
                return (
                  <tr key={ranking.player.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-emerald-400 font-bold">#{displayRank}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getPlayerThumbnailUrl(ranking.player.name)}
                          alt={ranking.player.name}
                          className="w-10 h-8 object-cover rounded bg-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <div className="font-semibold">{ranking.player.name}</div>
                          <div className="text-xs text-slate-400">{ranking.player.season}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{ranking.player.team}</td>
                    <td className="py-3 px-4 text-slate-300">
                      #{ranking.rank} <span className="text-xs text-slate-500">({ranking.compositeScore.toFixed(1)})</span>
                    </td>
                    <td className="py-3 px-4">
                      {displayVotes ? (
                        <span className="text-yellow-400">
                          {displayVotes.wins}W-{displayVotes.losses}L
                          {useSimulated && <span className="text-xs text-slate-500 ml-1">*</span>}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {ranking.ringerRank ? `#${ranking.ringerRank}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>Rankings based on Win Shares and other advanced metrics from Basketball Reference.</p>
        </div>
      </div>
    </div>
  );
}
