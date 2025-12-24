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
  bpm: 0.20,    // Box Plus Minus - most comprehensive single metric
  vorp: 0.18,   // Value Over Replacement - accounts for playing time
  ws48: 0.18,   // Win Shares per 48 - efficiency metric
  per: 0.12,    // Player Efficiency Rating - traditional advanced stat
  obpm: 0.08,   // Offensive impact
  dbpm: 0.08,   // Defensive impact
  // New weights for role/usage
  starter_bonus: 0.08,  // Bonus for being a starter
  minutes_weight: 0.08, // Weight by minutes played
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

  // Iterate through defined weights for advanced metrics
  const advancedMetrics = ['bpm', 'vorp', 'ws48', 'per', 'obpm', 'dbpm'];
  advancedMetrics.forEach((key) => {
    if (!(key in METRIC_WEIGHTS)) return;
    
    const weight = METRIC_WEIGHTS[key as keyof typeof METRIC_WEIGHTS];
    
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

  // Add starter bonus
  const starterRatio = player.games > 0 ? player.games_started / player.games : 0;
  const starterBonus = starterRatio * 100; // 0-100 based on % of games started
  compositeScore += starterBonus * METRIC_WEIGHTS.starter_bonus;
  totalWeight += METRIC_WEIGHTS.starter_bonus;

  // Add minutes weighting (normalize minutes across all players)
  const allMinutes = allPlayers.map(p => p.minutes).filter(v => Number.isFinite(v));
  const minMinutes = Math.min(...allMinutes);
  const maxMinutes = Math.max(...allMinutes);
  const normalizedMinutes = normalize(player.minutes, minMinutes, maxMinutes);
  compositeScore += normalizedMinutes * METRIC_WEIGHTS.minutes_weight;
  totalWeight += METRIC_WEIGHTS.minutes_weight;

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
    
    // Find Ringer rank for this player - use full name matching
    const playerNameLower = player.name.toLowerCase().trim();
    const playerNameParts = playerNameLower.split(' ').filter(p => p.length > 0);
    if (playerNameParts.length === 0) {
      return {
        player,
        compositeScore: score,
        rank: 0,
        ringerRank: null,
        rankDifference: null,
        metrics,
      };
    }
    const playerLastName = playerNameParts[playerNameParts.length - 1];
    const playerFirstName = playerNameParts[0];
    
    const ringerRank = ringerRankings.find(r => {
      const ringerNameLower = r.player.toLowerCase().trim();
      const ringerParts = ringerNameLower.split(' ').filter(p => p.length > 0);
      if (ringerParts.length === 0) return false;
      const ringerLastName = ringerParts[ringerParts.length - 1];
      const ringerFirstName = ringerParts[0];
      
      // Exact full name match (ignoring accents)
      if (ringerNameLower === playerNameLower) return true;
      
      // Match by first AND last name (handles accent differences like Jokić vs Jokic)
      if (ringerFirstName === playerFirstName && 
          (ringerLastName === playerLastName || 
           (playerLastName.length >= 4 && ringerLastName.startsWith(playerLastName.slice(0, 4))) ||
           (ringerLastName.length >= 4 && playerLastName.startsWith(ringerLastName.slice(0, 4))))) {
        return true;
      }
      
      // Handle hyphenated names like Gilgeous-Alexander
      if (ringerNameLower.includes(playerLastName) && ringerFirstName === playerFirstName) {
        return true;
      }
      
      return false;
    })?.rank || null;

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
