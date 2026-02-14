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

  return (
    <div className="max-w-5xl mx-auto px-4 page-enter">
      {/* Returning User Banner */}
      {userProgress && userProgress.lastAgreementPercentage !== null && (
        <div className="glass rounded-xl px-5 py-3 mb-8 text-center animate-fade-in">
          <p className="text-sm text-slate-400">
            Your last agreement score (from your picks):{" "}
            <span className="text-emerald-400 font-bold text-base">
              {userProgress.lastAgreementPercentage}%
            </span>
          </p>
          {currentStreak > 1 && (
            <p className="text-sm text-amber-400 font-semibold mt-1">
              {currentStreak} day streak
            </p>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center py-10 sm:py-16 md:py-24 space-y-6 sm:space-y-8">
        <div className="space-y-3 sm:space-y-4 animate-slide-up">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-emerald-400 font-semibold">
            NBA Player Rankings
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
            Who's Yur{" "}
            <span className="text-gradient-gold">GOAT</span>
            <span className="text-amber-400">?</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Rank the best basketball players using real stats, head-to-head matchups,
            and see how your picks stack up against the crowd.
          </p>
        </div>

        {/* Two Game Mode Cards */}
        <div className="pt-4 sm:pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
          {/* Daily Game Card */}
          <Link
            to="/daily"
            className="group relative overflow-hidden rounded-2xl p-6 sm:p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.99] bg-gradient-to-br from-emerald-600/90 to-emerald-900 border border-emerald-500/20 shadow-xl hover:shadow-emerald-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
            <div className="relative">
              <span className="inline-block px-3 py-1 bg-emerald-400/20 rounded-full text-emerald-300 text-xs font-semibold mb-4 tracking-wide uppercase">
                Daily Challenge
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Peoples Champ</h3>
              <p className="text-emerald-100/70 text-sm mb-6 leading-relaxed">
                Vote on today's 10 matchups featuring current NBA stars. New players every day.
              </p>
              <div className="flex items-center text-emerald-300 font-semibold text-sm">
                Play Now
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* All-Time Card */}
          <Link
            to="/alltime"
            className="group relative overflow-hidden rounded-2xl p-6 sm:p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.99] bg-gradient-to-br from-amber-600/90 to-amber-900 border border-amber-500/20 shadow-xl hover:shadow-amber-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
            <div className="relative">
              <span className="inline-block px-3 py-1 bg-amber-400/20 rounded-full text-amber-300 text-xs font-semibold mb-4 tracking-wide uppercase">
                Build Your List
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">All-Time GOAT</h3>
              <p className="text-amber-100/70 text-sm mb-6 leading-relaxed">
                Build your all-time top 10, 50, or 100 list with legends and current stars.
              </p>
              <div className="flex items-center text-amber-300 font-semibold text-sm">
                Create List
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-10 sm:py-16 border-t border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10 text-slate-200">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              step: "1",
              title: "Pick Your Matchup",
              desc: "Choose from today's featured NBA stars or build an all-time list",
            },
            {
              step: "2",
              title: "Vote Head-to-Head",
              desc: "Decide who's better using real stats and your basketball knowledge",
            },
            {
              step: "3",
              title: "See Your Rankings",
              desc: "Compare your results against consensus and expert rankings",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-lg font-bold group-hover:bg-emerald-500/20 transition">
                {step}
              </div>
              <h3 className="font-semibold text-slate-200 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 sm:py-12 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link to="/daily" className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 w-full sm:w-auto text-center">
            Play Today's Game
          </Link>
          <Link to="/rankings" className="btn-secondary text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 w-full sm:w-auto text-center">
            View Rankings
          </Link>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-8 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
          {["Real NBA Stats", "Updated Daily", "Expert Benchmark"].map((text) => (
            <span key={text} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {text}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
