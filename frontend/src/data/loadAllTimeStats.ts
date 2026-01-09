// Loader for all-time player stats from all_time_pre_26.csv
// This contains detailed season stats for legendary players

export interface AllTimePlayerStats {
  rank: number;
  name: string;
  winShares: number;
  season: string;
  age: number;
  team: string;
  games: number;
  gamesStarted: number | null;
  allStar: boolean;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fgPct: number;
  threePct: number | null;
  ftPct: number | null;
  tsPct: number;
  position: string;
  playerId: string;
}

export interface PlayerCareerStats {
  name: string;
  playerId: string;
  bestSeason: AllTimePlayerStats;
  allSeasons: AllTimePlayerStats[];
  peakWinShares: number;
  totalSeasons: number;
  positions: string[];
  teams: string[];
  primaryTeam: string;
  primaryPosition: string;
}

// Parse a number, returning null for empty strings
function parseNum(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

// Parse percentage (already in decimal form like .574)
function parsePct(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

export async function loadAllTimeStats(): Promise<AllTimePlayerStats[]> {
  const response = await fetch('/data/all_time_pre_26.csv');
  if (!response.ok) {
    throw new Error('Failed to load all-time stats');
  }
  
  const text = await response.text();
  const lines = text.trim().split('\n');
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const stats: AllTimePlayerStats[] = [];
  
  for (const line of dataLines) {
    // Parse CSV properly handling commas
    const cols = line.split(',');
    if (cols.length < 35) continue;
    
    const stat: AllTimePlayerStats = {
      rank: parseInt(cols[0]) || 0,
      name: cols[1]?.trim() || '',
      winShares: parseFloat(cols[2]) || 0,
      season: cols[3]?.trim() || '',
      age: parseInt(cols[4]) || 0,
      team: cols[5]?.trim() || '',
      games: parseInt(cols[6]) || 0,
      gamesStarted: parseNum(cols[7]),
      allStar: cols[8] === '1',
      minutes: parseInt(cols[9]) || 0,
      points: parseInt(cols[26]) || 0,
      rebounds: parseInt(cols[20]) || 0,
      assists: parseInt(cols[21]) || 0,
      steals: parseNum(cols[22]),
      blocks: parseNum(cols[23]),
      turnovers: parseNum(cols[24]),
      fgPct: parsePct(cols[27]) || 0,
      threePct: parsePct(cols[29]),
      ftPct: parsePct(cols[30]),
      tsPct: parsePct(cols[31]) || 0,
      position: cols[33]?.trim() || '',
      playerId: cols[34]?.trim() || '',
    };
    
    if (stat.name) {
      stats.push(stat);
    }
  }
  
  return stats;
}

// Aggregate stats by player to get career summary
export async function loadPlayerCareerStats(): Promise<PlayerCareerStats[]> {
  const allStats = await loadAllTimeStats();
  
  // Group by player name
  const playerMap = new Map<string, AllTimePlayerStats[]>();
  
  for (const stat of allStats) {
    const existing = playerMap.get(stat.name) || [];
    existing.push(stat);
    playerMap.set(stat.name, existing);
  }
  
  // Build career stats for each player
  const careerStats: PlayerCareerStats[] = [];
  
  for (const [name, seasons] of playerMap) {
    // Sort by win shares to find best season
    const sortedSeasons = [...seasons].sort((a, b) => b.winShares - a.winShares);
    const bestSeason = sortedSeasons[0];
    
    // Find most common team (primary team)
    const teamCounts = new Map<string, number>();
    for (const s of seasons) {
      teamCounts.set(s.team, (teamCounts.get(s.team) || 0) + 1);
    }
    const primaryTeam = [...teamCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    
    // Find most common position
    const posCounts = new Map<string, number>();
    for (const s of seasons) {
      posCounts.set(s.position, (posCounts.get(s.position) || 0) + 1);
    }
    const primaryPosition = [...posCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    
    careerStats.push({
      name,
      playerId: bestSeason.playerId,
      bestSeason,
      allSeasons: sortedSeasons,
      peakWinShares: bestSeason.winShares,
      totalSeasons: seasons.length,
      positions: [...new Set(seasons.map(s => s.position))],
      teams: [...new Set(seasons.map(s => s.team))],
      primaryTeam,
      primaryPosition,
    });
  }
  
  // Sort by peak win shares
  careerStats.sort((a, b) => b.peakWinShares - a.peakWinShares);
  
  return careerStats;
}

// Get unique players list for the ranking interface
export async function getUniqueAllTimePlayers(): Promise<PlayerCareerStats[]> {
  return loadPlayerCareerStats();
}
