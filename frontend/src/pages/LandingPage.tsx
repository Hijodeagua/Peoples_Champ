import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 font-semibold">
            WHO'S YUR GOAT
          </p>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Who ya got?
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Compare NBA stars head-to-head using real stats. Your votes decide Who's Yur GOAT.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
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

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="text-3xl mb-3">🏀</div>
            <h3 className="text-lg font-bold mb-2">Real Stats</h3>
            <p className="text-sm text-slate-300">
              Data comes from Basketball Reference
            </p>
          </div>
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="text-3xl mb-3">⚖️</div>
            <h3 className="text-lg font-bold mb-2">Head-to-Head</h3>
            <p className="text-sm text-slate-300">
              Compare 5 players through 10 matchups to reveal your true rankings
            </p>
          </div>
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-bold mb-2">See Results</h3>
            <p className="text-sm text-slate-300">
              Compare the GOAT votes against both our internal ELO model and The Ringer's Top 100
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
