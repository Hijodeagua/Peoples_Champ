import { useEffect, useState } from "react";
import {
  getTodayGame,
  submitGame,
  type GameTodayResponse,
  type AnswerPayload,
  type GameSubmitRequest,
  type GameSubmitResponse,
  type GameMode,
} from "../api/game";

type MatchupChoiceMap = Record<number, string>; // matchup_id -> winner_id

export default function PlayPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameTodayResponse | null>(null);

  const [choices, setChoices] = useState<MatchupChoiceMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GameSubmitResponse | null>(null);
  const [mode, setMode] = useState<GameMode>("GUESS");

  // Load today's game on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTodayGame();
        if (!cancelled) {
          setGame(data);
          setChoices({});
          setResult(null);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load today's game. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePick = (matchupId: number, winnerId: string) => {
    setChoices((prev) => ({
      ...prev,
      [matchupId]: winnerId,
    }));
  };

  const handleSubmit = async () => {
    if (!game) return;
    if (Object.keys(choices).length !== game.matchups.length) {
      alert("Please answer all matchups first.");
      return;
    }

    const answers: AnswerPayload[] = game.matchups.map((m) => ({
      matchup_id: m.id,
      winner_id: choices[m.id],
    }));

    const payload: GameSubmitRequest = {
      daily_set_id: game.daily_set_id,
      mode,
      answers,
    };

    try {
      setSubmitting(true);
      setError(null);
      const resp = await submitGame(payload);
      setResult(resp);
    } catch (e: any) {
      console.error(e);
      setError("There was a problem submitting your answers.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p>Loading today's GOAT matchups…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <p>{error}</p>
        <button
          className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p>No game available today.</p>
      </div>
    );
  }

  const playersById = Object.fromEntries(
    game.players.map((p) => [p.id, p])
  );
  const answeredCount = Object.keys(choices).length;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="w-full border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-bold text-lg">
          Who's Yur GOAT
        </a>
        <span className="text-xs text-slate-400">
          Daily set for {game.date}
        </span>
      </header>

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-2">Today&apos;s Matchups</h1>
        <p className="text-slate-300 mb-4 text-sm">
          Pick the better player in each matchup. Once you are done, we will
          show your final ranking and score.
        </p>

        <div className="flex gap-4 items-center mb-4 text-sm">
          <span className="font-semibold">Mode:</span>
          <button
            className={`px-3 py-1 rounded-full border ${
              mode === "GUESS"
                ? "bg-emerald-500 text-black border-emerald-400"
                : "border-slate-600"
            }`}
            onClick={() => setMode("GUESS")}
          >
            Guess the Rankings
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              mode === "OWN"
                ? "bg-emerald-500 text-black border-emerald-400"
                : "border-slate-600"
            }`}
            onClick={() => setMode("OWN")}
          >
            Pick Your Own
          </button>
        </div>

        <div className="text-xs text-slate-400 mb-2">
          {answeredCount} of {game.matchups.length} matchups answered
        </div>

        <div className="flex flex-col gap-4 mb-6">
          {game.matchups.map((m, idx) => {
            const pA = playersById[m.player_a_id];
            const pB = playersById[m.player_b_id];
            const choice = choices[m.id];

            return (
              <div
                key={m.id}
                className="border border-slate-800 rounded-xl p-3 bg-slate-900/60"
              >
                <div className="text-xs text-slate-400 mb-2">
                  Matchup {idx + 1}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className={`flex-1 px-3 py-2 rounded-lg border text-left ${
                      choice === pA.id
                        ? "border-emerald-400 bg-emerald-500 text-black"
                        : "border-slate-700 bg-slate-800"
                    }`}
                    onClick={() => handlePick(m.id, pA.id)}
                  >
                    <div className="font-semibold text-sm">{pA.name}</div>
                    <div className="text-xs text-slate-300">
                      {pA.team ?? ""} {/* position not in API, so just team */}
                    </div>
                  </button>

                  <span className="text-xs text-slate-500">vs</span>

                  <button
                    className={`flex-1 px-3 py-2 rounded-lg border text-left ${
                      choice === pB.id
                        ? "border-emerald-400 bg-emerald-500 text-black"
                        : "border-slate-700 bg-slate-800"
                    }`}
                    onClick={() => handlePick(m.id, pB.id)}
                  >
                    <div className="font-semibold text-sm">{pB.name}</div>
                    <div className="text-xs text-slate-300">
                      {pB.team ?? ""}
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={submitting || answeredCount !== game.matchups.length}
        >
          {submitting ? "Submitting…" : "See My Ranking"}
        </button>

        {result && (
          <section className="mt-6 border border-slate-800 rounded-xl p-4 bg-slate-900/70">
            <h2 className="text-xl font-semibold mb-2">
              Your GOAT ranking
            </h2>
            <p className="text-sm text-slate-300 mb-3">
              Mode:{" "}
              <span className="font-semibold">
                {result.score.mode === "GUESS"
                  ? "Guess the Rankings"
                  : "Pick Your Own"}
              </span>
            </p>

            {result.score.points !== null && (
              <p className="text-sm text-slate-200 mb-2">
                Score:{" "}
                <span className="font-semibold">
                  {result.score.points} / {result.score.max_points}
                </span>
                {result.score.explanation && (
                  <> — {result.score.explanation}</>
                )}
              </p>
            )}

            <ol className="list-decimal list-inside text-sm text-slate-100 space-y-1 mt-3">
              {result.final_ranking.map((entry) => (
                <li key={entry.id}>
                  <span className="font-semibold">{entry.name}</span>{" "}
                  <span className="text-slate-400">
                    {entry.team ? `• ${entry.team}` : ""}
                  </span>
                </li>
              ))}
            </ol>

            <p className="text-xs text-slate-500 mt-3">
              Share code:{" "}
              <code className="bg-slate-800 px-2 py-1 rounded">
                {result.share_slug}
              </code>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
