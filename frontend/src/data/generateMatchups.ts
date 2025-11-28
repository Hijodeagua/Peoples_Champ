import type { Player } from "./loadPlayersFromCSV";

export type Matchup = {
  id: string;
  left: Player;
  right: Player;
};

/**
 * Generates all unique pair matchups from a list of players.
 * For 5 players, this produces 10 matchups (5 choose 2).
 */
export function generateAllPairMatchups(players: Player[]): Matchup[] {
  const matchups: Matchup[] = [];
  
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const left = players[i];
      const right = players[j];
      const id = `matchup-${left.id}-vs-${right.id}-${Date.now()}-${i}-${j}`;
      
      matchups.push({ id, left, right });
    }
  }
  
  return matchups;
}
