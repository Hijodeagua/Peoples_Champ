import * as Papa from "papaparse";

export type Player = {
  id: string;
  name: string;
  season: string;
  age: number;
  team: string;
  games: number;
  games_started: number;
  minutes: number;
  pos: string;
  ws: number;
  stats: {
    pts: number;
    ast: number;
    trb: number;
    stl: number;
    blk: number;
    fg_pct: number;
    three_pct: number;
    two_pct: number;
    ft_pct: number;
    ts_pct: number;
    efg_pct: number;
  };
  advanced: {
    bpm: number;
    obpm: number;
    dbpm: number;
    per: number;
    ws48: number;
    vorp: number;
  };
  percentiles?: {
    pts: number;
    ast: number;
    trb: number;
    stl: number;
    blk: number;
    fg_pct: number;
    three_pct: number;
    ft_pct: number;
    ts_pct: number;
    efg_pct: number;
  };
  raw: Record<string, any>;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat((value as string) ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRowToPlayer(row: Record<string, any>): Player {
  // Basic stats are missing in the advanced CSV, so we default to 0 or try to read if present
  // The divisor is 1 because the advanced CSV doesn't have per-game totals usually, but if it did we'd use G
  // Actually, advanced CSV usually doesn't have PTS/AST totals either.
  
  return {
    id: String(row["Player-additional"] ?? row.id ?? ""),
    name: String(row.Player ?? ""),
    season: "2025-26", // Default to current season as requested
    age: toNumber(row.Age),
    team: String(row.Team ?? ""),
    games: toNumber(row.G),
    games_started: toNumber(row.GS),
    minutes: toNumber(row.MP),
    pos: String(row.Pos ?? ""),
    ws: toNumber(row.WS),
    stats: {
      pts: toNumber(row.PTS), // Likely 0/undefined in advanced CSV
      ast: toNumber(row.AST),
      trb: toNumber(row.TRB),
      stl: toNumber(row.STL),
      blk: toNumber(row.BLK),
      fg_pct: toNumber(row["FG%"]),
      three_pct: toNumber(row["3P%"]),
      two_pct: toNumber(row["2P%"]),
      ft_pct: toNumber(row["FT%"]),
      ts_pct: toNumber(row["TS%"]),
      efg_pct: toNumber(row["eFG%"]), // This might be empty in advanced CSV? No, headers didn't show it.
    },
    advanced: {
      bpm: toNumber(row.BPM),
      obpm: toNumber(row.OBPM),
      dbpm: toNumber(row.DBPM),
      per: toNumber(row.PER),
      ws48: toNumber(row["WS/48"]),
      vorp: toNumber(row.VORP),
    },
    raw: row,
  };
}

function calculatePercentile(value: number, allValues: number[]): number {
  const sorted = allValues.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  
  const count = sorted.filter(v => v < value).length;
  return Math.round((count / sorted.length) * 100);
}

export async function loadPlayers(): Promise<Player[]> {
  const url = "/data/Bbref_Adv_25-26.csv";
  console.log("Fetching CSV from:", url);
  
  const response = await fetch(url);
  console.log("Response status:", response.status, response.statusText);
  
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  console.log("CSV text length:", csvText.length);
  
  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  console.log("Raw parsed results:", parsed);
  console.log("Number of rows parsed:", parsed.data.length);
  
  if (parsed.data.length > 0) {
    console.log("Sample row:", parsed.data[0]);
    console.log("Headers found:", Object.keys(parsed.data[0]));
  }

  if (parsed.errors.length) {
    console.warn("CSV parse errors:", parsed.errors);
  }

  const playerMap = new Map<string, Player>();

  parsed.data
    .filter((row: Record<string, any>) => row && row["Player-additional"])
    .forEach((row: Record<string, any>) => {
      const player = mapRowToPlayer(row);
      const existing = playerMap.get(player.id);
      
      if (!existing) {
        playerMap.set(player.id, player);
      } else {
        // If player exists, keep the one with more games played
        // or if games equal, maybe total minutes?
        if (player.games > existing.games) {
          playerMap.set(player.id, player);
        } else if (player.games === existing.games && player.minutes > existing.minutes) {
          playerMap.set(player.id, player);
        }
      }
    });

  const players = Array.from(playerMap.values());

  console.log("Total unique players loaded:", players.length);
  
  // Calculate percentiles for all players
  if (players.length > 0) {
    const allStats = {
      pts: players.map(p => p.stats.pts),
      ast: players.map(p => p.stats.ast),
      trb: players.map(p => p.stats.trb),
      stl: players.map(p => p.stats.stl),
      blk: players.map(p => p.stats.blk),
      fg_pct: players.map(p => p.stats.fg_pct),
      three_pct: players.map(p => p.stats.three_pct),
      ft_pct: players.map(p => p.stats.ft_pct),
      ts_pct: players.map(p => p.stats.ts_pct),
      efg_pct: players.map(p => p.stats.efg_pct),
    };

    players.forEach(player => {
      player.percentiles = {
        pts: calculatePercentile(player.stats.pts, allStats.pts),
        ast: calculatePercentile(player.stats.ast, allStats.ast),
        trb: calculatePercentile(player.stats.trb, allStats.trb),
        stl: calculatePercentile(player.stats.stl, allStats.stl),
        blk: calculatePercentile(player.stats.blk, allStats.blk),
        fg_pct: calculatePercentile(player.stats.fg_pct, allStats.fg_pct),
        three_pct: calculatePercentile(player.stats.three_pct, allStats.three_pct),
        ft_pct: calculatePercentile(player.stats.ft_pct, allStats.ft_pct),
        ts_pct: calculatePercentile(player.stats.ts_pct, allStats.ts_pct),
        efg_pct: calculatePercentile(player.stats.efg_pct, allStats.efg_pct),
      };
    });

    console.log("First player with percentiles:", players[0]);
  }

  return players;
}
