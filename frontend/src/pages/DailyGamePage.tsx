import { useState, useEffect } from "react";
import MatchupView from "../components/MatchupView";
import GlobalRankings from "../components/GlobalRankings";
import { getMyVotes } from "../api/game";

type TabType = "matchups" | "rankings";

export default function DailyGamePage() {
  const [activeTab, setActiveTab] = useState<TabType>("matchups");
  const [hasCheckedCompletion, setHasCheckedCompletion] = useState(false);

  // Check if user has completed voting - if so, show rankings tab
  useEffect(() => {
    async function checkCompletion() {
      try {
        const myVotes = await getMyVotes();
        if (myVotes.completed) {
          setActiveTab("rankings");
        }
      } catch (err) {
        // If endpoint fails, default to matchups tab
        console.error("Failed to check voting status:", err);
      } finally {
        setHasCheckedCompletion(true);
      }
    }
    checkCompletion();
  }, []);

  const handlePlayGame = () => {
    setActiveTab("matchups");
  };

  // Show loading state while checking completion
  if (!hasCheckedCompletion) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

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
