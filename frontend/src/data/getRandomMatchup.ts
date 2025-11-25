import { loadPlayers, Player } from "./loadPlayersFromCSV";

export type Matchup = {
  id: string;
  left: Player;
  right: Player;
};

function pickTwoDistinct<T>(items: T[]): [T, T] {
  if (items.length < 2) {
    throw new Error("Not enough players to create a matchup");
  }

  const firstIndex = Math.floor(Math.random() * items.length);
  let secondIndex = Math.floor(Math.random() * items.length);

  while (secondIndex === firstIndex) {
    secondIndex = Math.floor(Math.random() * items.length);
  }

  return [items[firstIndex], items[secondIndex]];
}

export async function getRandomMatchup(): Promise<Matchup> {
  const players = await loadPlayers();
  const [left, right] = pickTwoDistinct(players);
  const id = `matchup-${left.id}-${right.id}-${Date.now()}`;

  return { id, left, right };
}
