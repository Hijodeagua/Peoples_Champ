import Papa from "papaparse";

export type Player = {
  id: string;
  name: string;
  season: string;
  age: number;
  team: string;
  games: number;
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
  raw: Record<string, any>;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat((value as string) ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRowToPlayer(row: Record<string, any>): Player {
  return {
    id: String(row["Player-additional"] ?? row.id ?? ""),
    name: String(row.Player ?? ""),
    season: String(row.Season ?? ""),
    age: toNumber(row.Age),
    team: String(row.Team ?? ""),
    games: toNumber(row.G),
    minutes: toNumber(row.MP),
    pos: String(row.Pos ?? ""),
    ws: toNumber(row.WS),
    stats: {
      pts: toNumber(row.PTS),
      ast: toNumber(row.AST),
      trb: toNumber(row.TRB),
      stl: toNumber(row.STL),
      blk: toNumber(row.BLK),
      fg_pct: toNumber(row["FG%"]),
      three_pct: toNumber(row["3P%"]),
      two_pct: toNumber(row["2P%"]),
      ft_pct: toNumber(row["FT%"]),
      ts_pct: toNumber(row["TS%"]),
      efg_pct: toNumber(row["eFG%"]),
    },
    raw: row,
  };
}

export async function loadPlayers(): Promise<Player[]> {
  const response = await fetch("/data/past_3_11-17.csv");
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const parsed = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    console.warn("CSV parse errors", parsed.errors);
  }

  return parsed.data
    .filter((row) => row && row["Player-additional"])
    .map(mapRowToPlayer);
}
