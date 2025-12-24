/**
 * Simulates head-to-head matchups between players using a gradient between
 * our internal ELO model rankings and The Ringer's Top 100 rankings.
 * 
 * Each simulated "voter" has a random bias between:
 * - 100% trusting our ELO model
 * - 100% trusting The Ringer rankings
 * 
 * For each matchup, we simulate 100 voters and record wins/losses.
 */

import type { PlayerRanking } from "./rankingModel";

export interface SimulatedH2HResult {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  totalMatchups: number;
  winRate: number;
  h2hRank: number;
}

/**
 * Determines the winner of a single H2H matchup based on a voter's bias
 * @param playerA - First player
 * @param playerB - Second player  
 * @param voterBias - 0 = fully trusts ELO, 1 = fully trusts Ringer
 * @returns The winning player's ID
 */
function simulateSingleVote(
  playerA: PlayerRanking,
  playerB: PlayerRanking,
  voterBias: number
): string {
  // Get effective ranks for each player based on voter bias
  // Lower rank = better player
  
  // For ELO, use the internal rank (1 = best)
  const eloRankA = playerA.rank;
  const eloRankB = playerB.rank;
  
  // For Ringer, use their rank (null means unranked = worse than 100)
  const ringerRankA = playerA.ringerRank ?? 150; // Unranked = rank 150
  const ringerRankB = playerB.ringerRank ?? 150;
  
  // Blend the ranks based on voter bias
  // voterBias = 0 means 100% ELO, voterBias = 1 means 100% Ringer
  const effectiveRankA = eloRankA * (1 - voterBias) + ringerRankA * voterBias;
  const effectiveRankB = eloRankB * (1 - voterBias) + ringerRankB * voterBias;
  
  // Add some randomness to simulate voter uncertainty
  // The closer the ranks, the more likely an "upset"
  const rankDiff = Math.abs(effectiveRankA - effectiveRankB);
  const uncertaintyFactor = Math.max(0.05, 0.3 - rankDiff * 0.003); // 5-30% upset chance
  
  // Random factor for this vote
  const randomFactor = Math.random();
  
  // Lower effective rank wins, but with some randomness
  if (effectiveRankA < effectiveRankB) {
    // Player A is "better" - they win unless upset
    return randomFactor < uncertaintyFactor ? playerB.player.id : playerA.player.id;
  } else if (effectiveRankB < effectiveRankA) {
    // Player B is "better" - they win unless upset
    return randomFactor < uncertaintyFactor ? playerA.player.id : playerB.player.id;
  } else {
    // Tie - coin flip
    return randomFactor < 0.5 ? playerA.player.id : playerB.player.id;
  }
}

/**
 * Simulates a full H2H matchup between two players with 100 voters
 * @returns Object with vote counts for each player
 */
function simulateMatchup(
  playerA: PlayerRanking,
  playerB: PlayerRanking,
  numVoters: number = 100
): { winnerA: number; winnerB: number } {
  let winnerA = 0;
  let winnerB = 0;
  
  for (let i = 0; i < numVoters; i++) {
    // Each voter has a random bias between ELO (0) and Ringer (1)
    const voterBias = Math.random();
    const winnerId = simulateSingleVote(playerA, playerB, voterBias);
    
    if (winnerId === playerA.player.id) {
      winnerA++;
    } else {
      winnerB++;
    }
  }
  
  return { winnerA, winnerB };
}

/**
 * Run a full round-robin simulation for all players
 * Each player faces every other player once
 * @param rankings - Array of player rankings from our model
 * @param topN - Only simulate for top N players (default 100)
 * @returns Map of player ID to their simulated H2H results
 */
export function simulateAllH2HMatchups(
  rankings: PlayerRanking[],
  topN: number = 100
): Map<string, SimulatedH2HResult> {
  const players = rankings.slice(0, topN);
  const results = new Map<string, SimulatedH2HResult>();
  
  // Initialize results for all players
  for (const player of players) {
    results.set(player.player.id, {
      playerId: player.player.id,
      playerName: player.player.name,
      wins: 0,
      losses: 0,
      totalMatchups: 0,
      winRate: 0,
      h2hRank: 0,
    });
  }
  
  // Run round-robin matchups
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const playerA = players[i];
      const playerB = players[j];
      
      const { winnerA, winnerB } = simulateMatchup(playerA, playerB);
      
      // Update results for player A
      const resultA = results.get(playerA.player.id)!;
      if (winnerA > winnerB) {
        resultA.wins++;
      } else {
        resultA.losses++;
      }
      resultA.totalMatchups++;
      
      // Update results for player B
      const resultB = results.get(playerB.player.id)!;
      if (winnerB > winnerA) {
        resultB.wins++;
      } else {
        resultB.losses++;
      }
      resultB.totalMatchups++;
    }
  }
  
  // Calculate win rates
  for (const result of results.values()) {
    result.winRate = result.totalMatchups > 0 
      ? result.wins / result.totalMatchups 
      : 0;
  }
  
  // Assign H2H ranks based on win rate
  const sortedResults = [...results.values()].sort((a, b) => b.winRate - a.winRate);
  sortedResults.forEach((result, index) => {
    result.h2hRank = index + 1;
  });
  
  return results;
}

/**
 * Check if we should use simulated data vs real votes
 * @param realVotesCount - Average votes per player from real data
 * @param threshold - Minimum average votes needed (default 10)
 */
export function shouldUseSimulation(
  realVotesCount: number,
  threshold: number = 10
): boolean {
  return realVotesCount < threshold;
}

/**
 * Generate analysis data for the three comparison scenarios
 */
export interface PlayerAnalysisData {
  name: string;
  diff: number;
  bpm: number;
  ws: number;
  vorp: number;
  team: string;
}

export interface ComparisonAnalysis {
  scenario: 'h2h_vs_elo' | 'h2h_vs_ringer' | 'elo_vs_ringer';
  title: string;
  biggestOvervalued: PlayerAnalysisData[];
  biggestUndervalued: PlayerAnalysisData[];
  topPerformers: { name: string; rank: number; bpm: number }[];
  correlation: number;
  avgBpmUndervalued: number;
  avgBpmOvervalued: number;
}

export function generateComparisonAnalyses(
  rankings: PlayerRanking[],
  h2hResults: Map<string, SimulatedH2HResult>
): ComparisonAnalysis[] {
  const analyses: ComparisonAnalysis[] = [];
  
  // Prepare data with all three ranks and stats
  const playersWithAllRanks = rankings
    .filter(r => r.ringerRank !== null)
    .map(r => {
      const h2h = h2hResults.get(r.player.id);
      return {
        name: r.player.name,
        team: r.player.team,
        eloRank: r.rank,
        ringerRank: r.ringerRank!,
        h2hRank: h2h?.h2hRank ?? r.rank,
        bpm: r.player.advanced.bpm,
        ws: r.player.ws,
        vorp: r.player.advanced.vorp,
      };
    });
  
  // Helper to create PlayerAnalysisData with stats
  const createAnalysisData = (p: typeof playersWithAllRanks[0], diff: number): PlayerAnalysisData => ({
    name: p.name,
    diff,
    bpm: p.bpm,
    ws: p.ws,
    vorp: p.vorp,
    team: p.team,
  });

  // Helper to get top performers for a ranking type
  const getTopPerformers = (rankKey: 'h2hRank' | 'eloRank' | 'ringerRank') => {
    return [...playersWithAllRanks]
      .sort((a, b) => a[rankKey] - b[rankKey])
      .slice(0, 5)
      .map(p => ({ name: p.name, rank: p[rankKey], bpm: p.bpm }));
  };

  // 1. H2H vs ELO
  const h2hVsEloData = playersWithAllRanks.map(p => ({
    player: p,
    diff: p.h2hRank - p.eloRank,
  }));
  const h2hVsEloOvervalued = [...h2hVsEloData].sort((a, b) => b.diff - a.diff).slice(0, 5);
  const h2hVsEloUndervalued = [...h2hVsEloData].sort((a, b) => a.diff - b.diff).slice(0, 5);
  
  analyses.push({
    scenario: 'h2h_vs_elo',
    title: 'Head-to-Head vs Our ELO Model',
    biggestOvervalued: h2hVsEloOvervalued.map(d => createAnalysisData(d.player, d.diff)),
    biggestUndervalued: h2hVsEloUndervalued.map(d => createAnalysisData(d.player, d.diff)),
    topPerformers: getTopPerformers('h2hRank'),
    correlation: calculateCorrelation(
      playersWithAllRanks.map(p => p.h2hRank),
      playersWithAllRanks.map(p => p.eloRank)
    ),
    avgBpmUndervalued: h2hVsEloUndervalued.reduce((sum, d) => sum + d.player.bpm, 0) / h2hVsEloUndervalued.length,
    avgBpmOvervalued: h2hVsEloOvervalued.reduce((sum, d) => sum + d.player.bpm, 0) / h2hVsEloOvervalued.length,
  });
  
  // 2. H2H vs Ringer
  const h2hVsRingerData = playersWithAllRanks.map(p => ({
    player: p,
    diff: p.h2hRank - p.ringerRank,
  }));
  const h2hVsRingerOvervalued = [...h2hVsRingerData].sort((a, b) => b.diff - a.diff).slice(0, 5);
  const h2hVsRingerUndervalued = [...h2hVsRingerData].sort((a, b) => a.diff - b.diff).slice(0, 5);
  
  analyses.push({
    scenario: 'h2h_vs_ringer',
    title: 'Head-to-Head vs Ringer Top 100',
    biggestOvervalued: h2hVsRingerOvervalued.map(d => createAnalysisData(d.player, d.diff)),
    biggestUndervalued: h2hVsRingerUndervalued.map(d => createAnalysisData(d.player, d.diff)),
    topPerformers: getTopPerformers('ringerRank'),
    correlation: calculateCorrelation(
      playersWithAllRanks.map(p => p.h2hRank),
      playersWithAllRanks.map(p => p.ringerRank)
    ),
    avgBpmUndervalued: h2hVsRingerUndervalued.reduce((sum, d) => sum + d.player.bpm, 0) / h2hVsRingerUndervalued.length,
    avgBpmOvervalued: h2hVsRingerOvervalued.reduce((sum, d) => sum + d.player.bpm, 0) / h2hVsRingerOvervalued.length,
  });
  
  // 3. ELO vs Ringer
  const eloVsRingerData = playersWithAllRanks.map(p => ({
    player: p,
    diff: p.eloRank - p.ringerRank,
  }));
  const eloVsRingerOvervalued = [...eloVsRingerData].sort((a, b) => b.diff - a.diff).slice(0, 5);
  const eloVsRingerUndervalued = [...eloVsRingerData].sort((a, b) => a.diff - b.diff).slice(0, 5);
  
  analyses.push({
    scenario: 'elo_vs_ringer',
    title: 'Our ELO Model vs Ringer Top 100',
    biggestOvervalued: eloVsRingerOvervalued.map(d => createAnalysisData(d.player, d.diff)),
    biggestUndervalued: eloVsRingerUndervalued.map(d => createAnalysisData(d.player, d.diff)),
    topPerformers: getTopPerformers('eloRank'),
    correlation: calculateCorrelation(
      playersWithAllRanks.map(p => p.eloRank),
      playersWithAllRanks.map(p => p.ringerRank)
    ),
    avgBpmUndervalued: eloVsRingerUndervalued.reduce((sum, d) => sum + d.player.bpm, 0) / eloVsRingerUndervalued.length,
    avgBpmOvervalued: eloVsRingerOvervalued.reduce((sum, d) => sum + d.player.bpm, 0) / eloVsRingerOvervalued.length,
  });
  
  return analyses;
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}
