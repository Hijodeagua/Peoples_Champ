import type { Player } from "./loadPlayersFromCSV";
import type { RingerRanking } from "./loadRingerRankings";

/**
 * Composite ranking model using Basketball Reference advanced stats
 * 
 * Metrics used (from Basketball Reference):
 * - BPM (Box Plus Minus): Overall impact estimate
 * - OBPM (Offensive BPM): Offensive impact
 * - DBPM (Defensive BPM): Defensive impact
 * - PER (Player Efficiency Rating): Per-minute production
 * - WS (Win Shares): Wins contributed
 * - WS/48: Win Shares per 48 minutes
 * - VORP (Value Over Replacement Player): Total value estimate
 */

export type PlayerRanking = {
  player: Player;
  compositeScore: number;
  rank: number;
  ringerRank: number | null;
  rankDifference: number | null; // Our rank - Ringer rank (negative = we rank higher)
  metrics: {
    bpm?: number;
    obpm?: number;
    dbpm?: number;
    per?: number;
    ws?: number;
    ws48?: number;
    vorp?: number;
  };
};

/**
 * Metric weights for composite score calculation
 * Total should sum to 1.0
 */
const METRIC_WEIGHTS = {
  bpm: 0.25,    // Box Plus Minus - most comprehensive single metric
  vorp: 0.20,   // Value Over Replacement - accounts for playing time
  ws48: 0.20,   // Win Shares per 48 - efficiency metric
  per: 0.15,    // Player Efficiency Rating - traditional advanced stat
  obpm: 0.10,   // Offensive impact
  dbpm: 0.10,   // Defensive impact
};

/**
 * Normalize a value to 0-100 scale based on min/max in dataset
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50; // If all values are the same
  return ((value - min) / (max - min)) * 100;
}

/**
 * Calculate composite score for a player based on advanced metrics
 */
function calculateCompositeScore(
  player: Player,
  allPlayers: Player[]
): { score: number; metrics: PlayerRanking["metrics"] } {
  // Extract metrics from player stats
  const metrics: PlayerRanking["metrics"] = {
    ws: player.ws,
    bpm: player.advanced.bpm,
    obpm: player.advanced.obpm,
    dbpm: player.advanced.dbpm,
    per: player.advanced.per,
    ws48: player.advanced.ws48,
    vorp: player.advanced.vorp,
  };

  // Calculate composite score using defined weights
  let compositeScore = 0;
  let totalWeight = 0;

  // Iterate through defined weights
  (Object.keys(METRIC_WEIGHTS) as Array<keyof typeof METRIC_WEIGHTS>).forEach((key) => {
    const weight = METRIC_WEIGHTS[key];
    
    // Get values for this metric across all players to normalize
    const values = allPlayers.map(p => {
      if (key === 'ws48') return p.advanced.ws48;
      if (key === 'bpm') return p.advanced.bpm;
      if (key === 'obpm') return p.advanced.obpm;
      if (key === 'dbpm') return p.advanced.dbpm;
      if (key === 'per') return p.advanced.per;
      if (key === 'vorp') return p.advanced.vorp;
      return 0;
    }).filter(v => Number.isFinite(v));

    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Get player's value
    let val: number | undefined;
    if (key === 'ws48') val = metrics.ws48;
    else if (key === 'bpm') val = metrics.bpm;
    else if (key === 'obpm') val = metrics.obpm;
    else if (key === 'dbpm') val = metrics.dbpm;
    else if (key === 'per') val = metrics.per;
    else if (key === 'vorp') val = metrics.vorp;

    if (val !== undefined && Number.isFinite(val)) {
      const normalized = normalize(val, min, max);
      compositeScore += normalized * weight;
      totalWeight += weight;
    }
  });

  // Normalize by actual weights used
  if (totalWeight > 0) {
    compositeScore = compositeScore / totalWeight;
  }

  return { score: compositeScore, metrics };
}

/**
 * Generate rankings for all players using the composite model
 */
export function generateRankings(
  players: Player[],
  ringerRankings: RingerRanking[]
): PlayerRanking[] {
  // Calculate composite scores
  const playersWithScores = players.map(player => {
    const { score, metrics } = calculateCompositeScore(player, players);
    
    // Find Ringer rank for this player
    const ringerRank = ringerRankings.find(
      r => r.player.toLowerCase().includes(player.name.toLowerCase().split(' ')[0]) ||
           player.name.toLowerCase().includes(r.player.toLowerCase().split(' ')[0])
    )?.rank || null;

    return {
      player,
      compositeScore: score,
      rank: 0, // Will be assigned after sorting
      ringerRank,
      rankDifference: null, // Will be calculated after rank assignment
      metrics,
    };
  });

  // Sort by composite score (descending)
  playersWithScores.sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks and calculate differences
  const rankedPlayers = playersWithScores.map((p, index) => {
    const rank = index + 1;
    const rankDifference = p.ringerRank ? rank - p.ringerRank : null;
    
    return {
      ...p,
      rank,
      rankDifference,
    };
  });

  return rankedPlayers;
}

/**
 * Get top N players from rankings
 */
export function getTopPlayers(rankings: PlayerRanking[], n: number = 100): PlayerRanking[] {
  return rankings.slice(0, n);
}

/**
 * Find a player's ranking by name
 */
export function findPlayerRanking(
  rankings: PlayerRanking[],
  playerName: string
): PlayerRanking | null {
  const normalized = playerName.toLowerCase().trim();
  return rankings.find(
    r => r.player.name.toLowerCase().trim().includes(normalized) ||
         normalized.includes(r.player.name.toLowerCase().trim())
  ) || null;
}

/**
 * Get players with biggest ranking differences vs Ringer
 */
export function getBiggestDisagreements(
  rankings: PlayerRanking[],
  n: number = 10
): { overrated: PlayerRanking[]; underrated: PlayerRanking[] } {
  const withDifferences = rankings.filter(r => r.rankDifference !== null);
  
  // Overrated by Ringer (we rank them lower/worse)
  const overrated = [...withDifferences]
    .sort((a, b) => (b.rankDifference || 0) - (a.rankDifference || 0))
    .slice(0, n);
  
  // Underrated by Ringer (we rank them higher/better)
  const underrated = [...withDifferences]
    .sort((a, b) => (a.rankDifference || 0) - (b.rankDifference || 0))
    .slice(0, n);
  
  return { overrated, underrated };
}
