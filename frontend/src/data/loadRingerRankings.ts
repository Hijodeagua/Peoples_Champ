import Papa from "papaparse";
import type { ParseResult } from "papaparse";

export type RingerRanking = {
  rank: number;
  player: string;
  team: string;
};

type RingerRow = {
  Rank: string;
  Player: string;
  Team: string;
};

export async function loadRingerRankings(): Promise<RingerRanking[]> {
  try {
    const response = await fetch("/data/ringer_top_100.csv");
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Ringer rankings: ${response.statusText}`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse<RingerRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<RingerRow>) => {
          if (results.errors.length > 0) {
            console.error("CSV parsing errors:", results.errors);
          }

          const rankings = results.data
            .filter((row): row is RingerRow => row && !!row.Player)
            .map((row) => ({
              rank: Number(row.Rank),
              player: row.Player.trim(),
              team: row.Team.trim(),
            }));

          resolve(rankings);
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error("Error loading Ringer rankings:", error);
    throw error;
  }
}

/**
 * Get Ringer rank for a specific player by name
 */
export function getRingerRank(
  rankings: RingerRanking[],
  playerName: string
): number | null {
  const normalized = playerName.toLowerCase().trim();
  const found = rankings.find(
    (r) => r.player.toLowerCase().trim() === normalized
  );
  return found ? found.rank : null;
}
