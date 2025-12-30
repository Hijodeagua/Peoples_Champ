import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadUserProgress, getCurrentStreak, type UserProgress } from "../utils/userProgress";

export default function LandingPage() {
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    const progress = loadUserProgress();
    if (progress.lastCompletionDate) {
      setUserProgress(progress);
      setCurrentStreak(getCurrentStreak());
    }
  }, []);

  const scrollToRanking = () => {
    // Navigate to daily game page which has the main ranking interaction
    window.location.href = "/daily";
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Returning User Message */}
      {userProgress && userProgress.lastAgreementPercentage !== null && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 mb-6 text-center">
          <p className="text-sm text-slate-400">
            Last time you agreed with{" "}
            <span className="text-slate-200 font-medium">
              {userProgress.lastBenchmarkUsed || "The Ringer"}
            </span>
            :{" "}
            <span className="text-emerald-400 font-bold">
              {userProgress.lastAgreementPercentage}%
            </span>
          </p>
          {currentStreak > 1 && (
            <p className="text-sm text-amber-400 font-medium mt-1">
              🔥 Current streak: {currentStreak} days
            </p>
          )}
        </div>
      )}

      {/* Hero Section - Above the fold */}
      <section className="text-center py-16 space-y-6">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight">
          Who's Your GOAT?
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto">
          Rank and compare today's best active players.
        </p>
        <p className="text-base text-slate-400 max-w-xl mx-auto">
          See how your take stacks up against consensus and expert lists.
        </p>
        
        <div className="pt-4">
          <button
            onClick={scrollToRanking}
            className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-lg font-bold shadow-lg transition"
          >
            Start Ranking
          </button>
        </div>
        
        <p className="text-sm text-slate-500 italic">
          All-time rankings coming soon.
        </p>
      </section>

      {/* How It Works Section */}
      <section className="py-12 border-t border-slate-700">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Pick an active player or matchup</h3>
            <p className="text-sm text-slate-400">
              Choose from today's featured NBA stars
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Rank or vote based on who you think is better right now</h3>
            <p className="text-sm text-slate-400">
              Use real stats to make your case
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Compare your results to consensus and expert rankings</h3>
            <p className="text-sm text-slate-400">
              See how your take stacks up
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 border-t border-slate-700">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/daily"
            className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-lg font-bold shadow-lg transition"
          >
            Play Today's Game
          </Link>
          <Link
            to="/rankings"
            className="px-8 py-4 rounded-xl border-2 border-slate-600 hover:border-slate-500 text-slate-200 text-lg font-semibold transition"
          >
            View Rankings
          </Link>
        </div>
      </section>

      {/* Trust Signals / Credibility */}
      <section className="py-8 border-t border-slate-700">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Active players only
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Updated regularly
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Expert benchmark included
          </span>
        </div>
      </section>
    </div>
  );
}
