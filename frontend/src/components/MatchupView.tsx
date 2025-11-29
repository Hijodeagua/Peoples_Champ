import { useCallback, useEffect, useState } from "react";
import { getRandomMatchup, type Matchup } from "../data/getRandomMatchup";
import { submitVote } from "../api/voting";
import PlayerColumn from "./PlayerColumn";

const DAILY_MATCHUP_LIMIT = 5;

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

export default function MatchupView() {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [matchupIndex, setMatchupIndex] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);

  const loadMatchup = useCallback(async () => {
    setLoading(true);
    setSelectedPlayerId(null);
    setError(null);
    try {
      const nextMatchup = await getRandomMatchup();
      setMatchup(nextMatchup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matchup");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatchup();
  }, [loadMatchup]);

  const handleSubmit = () => {
    if (!matchup || !selectedPlayerId) return;
    submitVote(matchup.id, selectedPlayerId);
    
    const nextIndex = matchupIndex + 1;
    setMatchupIndex(nextIndex);
    
    if (nextIndex >= DAILY_MATCHUP_LIMIT) {
      setCompleted(true);
    } else {
      loadMatchup();
    }
  };

  const handleSkip = () => {
    const nextIndex = matchupIndex + 1;
    setMatchupIndex(nextIndex);
    
    if (nextIndex >= DAILY_MATCHUP_LIMIT) {
      setCompleted(true);
    } else {
      loadMatchup();
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 font-semibold">
          PEOPLE&apos;S CHAMP
        </p>
        <h1 className="text-4xl font-bold">Who is the best player right now?</h1>
        <p className="text-slate-300 max-w-3xl mx-auto leading-relaxed">
          We are using regular season stats from the two seasons before this year to decide which star has the stronger case. Pick the season you think was better.
        </p>
      </header>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-3 rounded">
          {error}
        </div>
      )}

      {!completed && (
        <p className="text-center text-sm text-slate-400 font-medium">
          Matchup {Math.min(matchupIndex + 1, DAILY_MATCHUP_LIMIT)} of {DAILY_MATCHUP_LIMIT}
        </p>
      )}

      {completed ? (
        <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-emerald-400">You&apos;re done for today!</h2>
          <p className="text-slate-300 text-lg">
            You&apos;ve completed all {DAILY_MATCHUP_LIMIT} matchups. Come back tomorrow for more!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div>
              {matchup && (
                <PlayerColumn
                  player={matchup.left}
                  selected={selectedPlayerId === matchup.left.id}
                  onSelect={setSelectedPlayerId}
                  statDescriptions={STAT_DESCRIPTIONS}
                />
              )}
            </div>

            <div>
              {matchup && (
                <PlayerColumn
                  player={matchup.right}
                  selected={selectedPlayerId === matchup.right.id}
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
        * Stats pulled from Basketball Reference as of 11/17/2024.
      </p>
    </div>
  );
}
