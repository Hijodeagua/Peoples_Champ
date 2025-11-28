import { useState } from "react";

export default function ArchivePage() {
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Placeholder past games
  const pastGames = [
    { date: "November 25, 2024", players: "Jokić, SGA, Giannis, Luka, AD" },
    { date: "November 24, 2024", players: "Curry, LeBron, Durant, Embiid, Tatum" },
    { date: "November 23, 2024", players: "Harden, Butler, George, Leonard, Mitchell" },
    { date: "November 22, 2024", players: "Booker, Towns, Sabonis, Brunson, Fox" },
    { date: "November 21, 2024", players: "Edwards, Haliburton, Maxey, Banchero, Wembanyama" },
  ];

  const handleReplay = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="text-center space-y-3 mb-10">
        <h1 className="text-4xl font-bold">Archive</h1>
        <p className="text-slate-300">
          Replay past daily games and see how you ranked players on previous days
        </p>
      </header>

      {showComingSoon && (
        <div className="mb-6 p-4 bg-emerald-900/40 border border-emerald-700 text-emerald-200 rounded-lg text-center">
          Replay feature coming soon! We're working on letting you revisit past matchups.
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>Coming Soon:</strong> Replay any past daily game and compare your rankings
            across different days.
          </p>
        </div>

        <div className="space-y-3">
          {pastGames.map((game, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-700 hover:border-slate-600 transition"
            >
              <div>
                <p className="font-semibold text-lg">{game.date}</p>
                <p className="text-sm text-slate-400">Players: {game.players}</p>
              </div>
              <button
                onClick={handleReplay}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition"
              >
                Replay
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          <p>More archived games will appear here as you play daily.</p>
        </div>
      </div>
    </div>
  );
}
