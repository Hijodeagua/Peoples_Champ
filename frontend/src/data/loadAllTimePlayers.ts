import Papa from "papaparse";
import type { ParseResult } from "papaparse";

export type AllTimePlayer = {
  name: string;
  era: string;
  position: string;
  championships: number;
  finalsMVPs: number;
  regularSeasonMVPs: number;
  allStarSelections: number;
  hallOfFame: boolean;
  isActive: boolean;
};

type AllTimePlayerRow = {
  Player: string;
  Era: string;
  Position: string;
  Championships: string;
  Finals_MVPs: string;
  Regular_Season_MVPs: string;
  All_Star_Selections: string;
  Hall_of_Fame: string;
};

export async function loadAllTimePlayers(): Promise<AllTimePlayer[]> {
  try {
    const response = await fetch("/data/nba_top_75_alltime.csv");
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all-time players: ${response.statusText}`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse<AllTimePlayerRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<AllTimePlayerRow>) => {
          if (results.errors.length > 0) {
            console.error("CSV parsing errors:", results.errors);
          }

          const players = results.data
            .filter((row): row is AllTimePlayerRow => row && !!row.Player)
            .map((row) => ({
              name: row.Player.trim(),
              era: row.Era.trim(),
              position: row.Position.trim(),
              championships: Number(row.Championships) || 0,
              finalsMVPs: Number(row.Finals_MVPs) || 0,
              regularSeasonMVPs: Number(row.Regular_Season_MVPs) || 0,
              allStarSelections: Number(row.All_Star_Selections) || 0,
              hallOfFame: row.Hall_of_Fame.trim().toLowerCase() === 'yes',
              isActive: row.Hall_of_Fame.trim().toLowerCase() === 'active',
            }));

          resolve(players);
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error("Error loading all-time players:", error);
    throw error;
  }
}

/**
 * Get all-time players filtered by criteria
 */
export function filterAllTimePlayers(
  players: AllTimePlayer[],
  options: {
    includeActive?: boolean;
    includeHallOfFame?: boolean;
    minChampionships?: number;
    minMVPs?: number;
    positions?: string[];
  } = {}
): AllTimePlayer[] {
  const {
    includeActive = true,
    includeHallOfFame = true,
    minChampionships = 0,
    minMVPs = 0,
    positions = []
  } = options;

  return players.filter(player => {
    if (!includeActive && player.isActive) return false;
    if (!includeHallOfFame && player.hallOfFame) return false;
    if (player.championships < minChampionships) return false;
    if (player.regularSeasonMVPs < minMVPs) return false;
    if (positions.length > 0 && !positions.includes(player.position)) return false;
    
    return true;
  });
}
