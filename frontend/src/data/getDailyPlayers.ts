import { loadPlayers } from "./loadPlayersFromCSV";
import type { Player } from "./loadPlayersFromCSV";

/**
 * Selects a specified number of random distinct players from the CSV.
 * For now, this is random each time. Later we can make it deterministic per day.
 */
export async function getDailyPlayers(count: number = 5): Promise<Player[]> {
  const allPlayers = await loadPlayers();
  
  if (allPlayers.length < count) {
    throw new Error(`Not enough players in dataset. Need ${count}, have ${allPlayers.length}`);
  }

  // Shuffle and take first 'count' players
  const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
