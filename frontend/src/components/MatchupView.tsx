import { useCallback, useEffect, useState } from "react";
import { getRandomMatchup, Matchup } from "../data/getRandomMatchup";
import { submitVote } from "../api/voting";
import PlayerColumn from "./PlayerColumn";

export default function MatchupView() {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    loadMatchup();
  };

  const statLabels = ["PTS", "AST", "TRB", "STL", "BLK", "FG%", "3P%", "FT%", "TS%", "eFG%"];

  return (
    <div className="space-y-6">
      <header className="text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">People's Champ</p>
        <h1 className="text-3xl font-bold">Who deserves the crown?</h1>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Pick the better season from a random matchup. All stats load directly from the official CSV.
        </p>
      </header>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-200 p-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:order-1 order-1">
          {matchup && (
            <PlayerColumn
              player={matchup.left}
              selected={selectedPlayerId === matchup.left.id}
              onSelect={setSelectedPlayerId}
            />
          )}
        </div>

        <div className="hidden lg:flex flex-col items-center justify-center gap-3 text-sm text-slate-300">
          {statLabels.map((label) => (
            <span key={label} className="font-semibold">
              {label}
            </span>
          ))}
        </div>

        <div className="lg:order-3 order-2">
          {matchup && (
            <PlayerColumn
              player={matchup.right}
              selected={selectedPlayerId === matchup.right.id}
              onSelect={setSelectedPlayerId}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedPlayerId || loading}
          className="px-5 py-3 rounded-xl bg-emerald-500 text-black font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Submit Vote
        </button>
        <button
          type="button"
          onClick={loadMatchup}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
