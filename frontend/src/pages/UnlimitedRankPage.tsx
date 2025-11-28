import { useState } from "react";

const UNLOCK_CODE = "30>23";

export default function UnlimitedRankPage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code === UNLOCK_CODE) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Invalid access code. Please try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="text-center space-y-3 mb-10">
        <h1 className="text-4xl font-bold">Unlimited Rank</h1>
        <p className="text-slate-300">
          Advanced ranking tools and unlimited matchup modes
        </p>
      </header>

      {!unlocked ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold">Access Required</h2>
              <p className="text-slate-300">
                Enter your access code to unlock unlimited ranking features and advanced tools.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-300 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/40 border border-red-700 text-red-200 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition"
              >
                Unlock
              </button>
            </form>

            <div className="text-center text-sm text-slate-400">
              <p>Don't have a code? Contact us for access.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8">
          <div className="text-center space-y-6">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-emerald-400">Access Granted!</h2>
            <p className="text-slate-300 text-lg">
              Welcome to Unlimited Rank
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="p-6 bg-slate-700/30 rounded-lg border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Unlimited Rank Tools</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-3">•</span>
                  <span>
                    <strong>Custom Matchups:</strong> Create your own player matchups and compare
                    any players you want
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-3">•</span>
                  <span>
                    <strong>Full Season Analysis:</strong> Deep dive into complete season stats
                    with advanced metrics
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-3">•</span>
                  <span>
                    <strong>Historical Comparisons:</strong> Compare players across different eras
                    and seasons
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-3">•</span>
                  <span>
                    <strong>Export Rankings:</strong> Download your rankings and share them with
                    friends
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-3">•</span>
                  <span>
                    <strong>No Daily Limits:</strong> Play as many matchups as you want, whenever
                    you want
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
              <p className="text-yellow-200 text-sm text-center">
                <strong>Coming Soon:</strong> These features are currently in development. Check
                back soon!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
