import type { Matchup, Player } from "../api/game";

const POSITION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"] as const;

export function rankPlayersFromVotes(players: Player[], matchups: Matchup[], votes: Record<number, string>): Player[] {
  const wins: Record<string, number> = {};
  for (const player of players) {
    wins[player.id] = 0;
  }

  const matchupById = new Map<number, Matchup>(matchups.map((matchup) => [matchup.id, matchup]));

  for (const [matchupIdString, winnerId] of Object.entries(votes)) {
    const matchup = matchupById.get(Number(matchupIdString));
    if (!matchup) {
      continue;
    }

    if (winnerId === matchup.player_a_id || winnerId === matchup.player_b_id) {
      wins[winnerId] = (wins[winnerId] || 0) + 1;
    }
  }

  const compare = (a: Player, b: Player): number => {
    const aWins = wins[a.id] || 0;
    const bWins = wins[b.id] || 0;

    if (aWins !== bWins) {
      return bWins - aWins;
    }

    const directMatchup = matchups.find(
      (matchup) =>
        (matchup.player_a_id === a.id && matchup.player_b_id === b.id) ||
        (matchup.player_a_id === b.id && matchup.player_b_id === a.id),
    );

    if (directMatchup) {
      const votedWinner = votes[directMatchup.id];
      if (votedWinner === a.id) {
        return -1;
      }
      if (votedWinner === b.id) {
        return 1;
      }
    }

    return a.id.localeCompare(b.id);
  };

  return [...players].sort(compare);
}

export function formatDailyTopFiveShareText(topPlayers: string[]): string {
  return POSITION_EMOJIS.map((emoji, index) => `${emoji}: ${topPlayers[index] || ""}`).join("\n");
}
