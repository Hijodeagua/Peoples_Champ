import { useCallback, useEffect, useState } from "react";
import { getTodayGame, type GameTodayResponse } from "../api/game";
import { submitVote, getVotingStatus, type UserVotesResponse } from "../api/voting";

export default function MatchupView() {
  const [gameData, setGameData] = useState<GameTodayResponse | null>(null);
  const [currentMatchupIndex, setCurrentMatchupIndex] = useState<number>(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [votingStatus, setVotingStatus] = useState<UserVotesResponse | null>(null);
  const [votes, setVotes] = useState<Record<number, string>>({});

  const loadGameData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [game, status] = await Promise.all([
        getTodayGame(),
        getVotingStatus()
      ]);
      setGameData(game);
      setVotingStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

  const handleSubmit = async () => {
    if (!gameData || !selectedPlayerId) return;
    
    const currentMatchup = gameData.matchups[currentMatchupIndex];
    if (!currentMatchup) return;
    
    try {
      await submitVote(currentMatchup.id, selectedPlayerId);
      
      // Store the vote locally
      setVotes(prev => ({ ...prev, [currentMatchup.id]: selectedPlayerId }));
      
      // Move to next matchup
      const nextIndex = currentMatchupIndex + 1;
      if (nextIndex < gameData.matchups.length) {
        setCurrentMatchupIndex(nextIndex);
        setSelectedPlayerId(null);
      }
      
      // Refresh voting status
      const status = await getVotingStatus();
      setVotingStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    }
  };

  const handleSkip = () => {
    const nextIndex = currentMatchupIndex + 1;
    if (nextIndex < (gameData?.matchups.length || 0)) {
      setCurrentMatchupIndex(nextIndex);
      setSelectedPlayerId(null);
    }
  };

  const handlePrevious = () => {
    if (currentMatchupIndex > 0) {
      setCurrentMatchupIndex(currentMatchupIndex - 1);
      const prevMatchup = gameData?.matchups[currentMatchupIndex - 1];
      if (prevMatchup && votes[prevMatchup.id]) {
        setSelectedPlayerId(votes[prevMatchup.id]);
      } else {
        setSelectedPlayerId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading today's matchups...</p>
        </div>
      </div>
    );
  }

  if (!gameData || !votingStatus) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-300">No matchups available today.</p>
      </div>
    );
  }

  const currentMatchup = gameData.matchups[currentMatchupIndex];
  const player1 = gameData.players.find(p => p.id === currentMatchup?.player_a_id);
  const player2 = gameData.players.find(p => p.id === currentMatchup?.player_b_id);
  const isCompleted = votingStatus.completed;
  const hasVotedOnCurrent = currentMatchup && votes[currentMatchup.id];

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

      {!isCompleted && (
        <p className="text-center text-sm text-slate-400 font-medium">
          Matchup {currentMatchupIndex + 1} of {gameData.matchups.length} • {votingStatus.votes_today} votes submitted
        </p>
      )}

      {isCompleted ? (
        <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold text-emerald-400">You&apos;re done for today!</h2>
          <p className="text-slate-300 text-lg">
            You&apos;ve completed all {gameData.matchups.length} matchups. Come back tomorrow for more!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div>
              {player1 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlayerId(player1.id)}
                  className={`w-full text-left rounded-xl p-5 shadow border transition hover:bg-slate-800/50 bg-slate-800/30 backdrop-blur cursor-pointer ${
                    selectedPlayerId === player1.id ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xl font-bold">{player1.name}</p>
                      <p className="text-sm text-slate-400">
                        {player1.team}
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            <div>
              {player2 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlayerId(player2.id)}
                  className={`w-full text-left rounded-xl p-5 shadow border transition hover:bg-slate-800/50 bg-slate-800/30 backdrop-blur cursor-pointer ${
                    selectedPlayerId === player2.id ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xl font-bold">{player2.name}</p>
                      <p className="text-sm text-slate-400">
                        {player2.team}
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {currentMatchupIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
              >
                Previous
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedPlayerId || loading}
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold shadow-lg hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {hasVotedOnCurrent ? "Update Vote" : "Submit Vote"}
            </button>
            {currentMatchupIndex < gameData.matchups.length - 1 && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Skip
              </button>
            )}
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-slate-400 text-center">
        * Stats pulled from Basketball Reference as of 11/17/2024.
      </p>
    </div>
  );
}
