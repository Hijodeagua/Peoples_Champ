import { useState, useEffect } from "react";
import MatchupView from "../components/MatchupView";
import GlobalRankings from "../components/GlobalRankings";
import { getMyVotes } from "../api/game";
import { loadUserProgress, getCurrentStreak, hasCompletedToday, type UserProgress } from "../utils/userProgress";

type TabType = "matchups" | "rankings";

export default function DailyGamePage() {
  const [activeTab, setActiveTab] = useState<TabType>("matchups");
  const [hasCheckedCompletion, setHasCheckedCompletion] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);

  // Load user progress from localStorage
  useEffect(() => {
    const progress = loadUserProgress();
    if (progress.lastCompletionDate) {
      setUserProgress(progress);
      setCurrentStreak(getCurrentStreak());
      setCompletedToday(hasCompletedToday());
    }
  }, []);

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
      {/* Returning User Message - show if not completed today but has previous data */}
      {userProgress && userProgress.lastAgreementPercentage !== null && !completedToday && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-center max-w-lg mx-auto">
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
          {currentStreak > 0 && (
            <p className="text-sm text-amber-400 font-medium mt-1">
              🔥 {currentStreak === 1 ? "Keep your streak going!" : `Current streak: ${currentStreak} days`}
            </p>
          )}
        </div>
      )}

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
