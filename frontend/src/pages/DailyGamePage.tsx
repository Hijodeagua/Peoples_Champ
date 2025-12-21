import { useState } from "react";
import MatchupView from "../components/MatchupView";
import GlobalRankings from "../components/GlobalRankings";

type TabType = "matchups" | "rankings";

export default function DailyGamePage() {
  const [activeTab, setActiveTab] = useState<TabType>("matchups");

  const handlePlayGame = () => {
    setActiveTab("matchups");
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("matchups")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "matchups"
                ? "bg-emerald-500 text-black"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Daily Matchups
          </button>
          <button
            onClick={() => setActiveTab("rankings")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "rankings"
                ? "bg-amber-500 text-black"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Today's Global Rankings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "matchups" ? (
        <MatchupView />
      ) : (
        <GlobalRankings onPlayGame={handlePlayGame} />
      )}
    </div>
  );
}
