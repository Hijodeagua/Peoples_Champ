import { useCallback, useEffect, useState } from "react";
import { getDailyPlayers } from "../data/getDailyPlayers";
import { generateAllPairMatchups } from "../data/generateMatchups";
import type { Matchup } from "../data/generateMatchups";
import type { Player } from "../data/loadPlayersFromCSV";
import { submitVote } from "../api/voting";
import PlayerColumn from "../components/PlayerColumn";

const STAT_DESCRIPTIONS: Record<string, string> = {
  PPG: "Points per game.",
  APG: "Assists per game.",
  RPG: "Total rebounds per game.",
  SPG: "Steals per game.",
  BPG: "Blocks per game.",
  "FG%": "Field goal percentage.",
  "3P%": "Three point field goal percentage.",
  "FT%": "Free throw percentage.",
  "TS%": "True shooting percentage, combines twos, threes, and free throws.",
  "eFG%": "Effective field goal percentage, gives extra weight to made threes."
};

type VoteRecord = {
  matchupId: string;
  winnerId: string;
  loserId: string;
};

export default function DailyGamePage() {
  const [dailyPlayers, setDailyPlayers] = useState<Player[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);

  const loadDailyGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const players = await getDailyPlayers(5);
      const allMatchups = generateAllPairMatchups(players);
      
      setDailyPlayers(players);
      setMatchups(allMatchups);
      setCurrentIndex(0);
      setVotes([]);
      setCompleted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily game");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDailyGame();
  }, [loadDailyGame]);

  const handleSubmit = () => {
    const currentMatchup = matchups[currentIndex];
    if (!currentMatchup || !selectedPlayerId) return;

    const loserId = selectedPlayerId === currentMatchup.left.id 
      ? currentMatchup.right.id 
      : currentMatchup.left.id;

    const voteRecord: VoteRecord = {
      matchupId: currentMatchup.id,
      winnerId: selectedPlayerId,
      loserId: loserId,
    };

    setVotes([...votes, voteRecord]);
    submitVote(currentMatchup.id, selectedPlayerId);
    
    const nextIndex = currentIndex + 1;
    setSelectedPlayerId(null);
    
    if (nextIndex >= matchups.length) {
      setCompleted(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkip = () => {
    const nextIndex = currentIndex + 1;
    setSelectedPlayerId(null);
    
    if (nextIndex >= matchups.length) {
      setCompleted(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">🏀</div>
        <p className="text-xl text-slate-300">Loading today's matchups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-6 rounded-xl text-center">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const currentMatchup = matchups[currentIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <header className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 font-semibold">
            PEOPLE'S CHAMP
          </p>
          <h1 className="text-4xl font-bold">Who is the best player right now?</h1>
          <p className="text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Pick the player you think is Best Right Now. Stats come from the two seasons prior to this year.
          </p>
        </header>

        {!completed && (
          <p className="text-center text-sm text-slate-400 font-medium">
            Matchup {currentIndex + 1} of {matchups.length}
          </p>
        )}

        {completed ? (
          <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-emerald-400">Game Complete!</h2>
            <p className="text-slate-300 text-lg">
              You've completed all {matchups.length} matchups for today's 5 players.
            </p>
            
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-left">
              <h3 className="text-xl font-bold mb-4">Today's Players</h3>
              <div className="space-y-2">
                {dailyPlayers.map((player, idx) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-emerald-400 font-bold">#{idx + 1}</span>
                    <span className="font-semibold">{player.name}</span>
                    <span className="text-sm text-slate-400">
                      {player.team} • {player.season}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Coming Soon:</strong> See how your rankings compare to our ELO model, site-wide
                Peoples Rankings, and The Ringer's NBA Top 100!
              </p>
            </div>

            <button
              onClick={loadDailyGame}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition"
            >
              Play Again (New 5 Players)
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div>
                {currentMatchup && (
                  <PlayerColumn
                    player={currentMatchup.left}
                    selected={selectedPlayerId === currentMatchup.left.id}
                    onSelect={setSelectedPlayerId}
                    statDescriptions={STAT_DESCRIPTIONS}
                  />
                )}
              </div>

              <div>
                {currentMatchup && (
                  <PlayerColumn
                    player={currentMatchup.right}
                    selected={selectedPlayerId === currentMatchup.right.id}
                    onSelect={setSelectedPlayerId}
                    statDescriptions={STAT_DESCRIPTIONS}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedPlayerId || loading}
                className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold shadow-lg hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Submit Vote
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Skip
              </button>
            </div>
          </>
        )}

        <p className="mt-8 text-xs text-slate-400 text-center">
          * Stats pulled from Basketball Reference as of 11/17/2024. Player order will eventually be
          compared with The Ringer NBA Top 100.
        </p>
      </div>
    </div>
  );
}
