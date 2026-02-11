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
          setCompletedToday(true);
        }
      } catch (err) {
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
      <div className="flex items-center justify-center min-h-[300px] page-enter">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-emerald-500 mx-auto"></div>
          <p className="text-sm text-slate-400">Loading game...</p>
          <p className="text-xs text-slate-500">Waking the server if needed. This can take up to a minute on first visit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Returning User Banner */}
      {userProgress && userProgress.lastAgreementPercentage !== null && !completedToday && (
        <div className="glass rounded-xl px-5 py-3 text-center max-w-lg mx-auto animate-fade-in">
          <p className="text-sm text-slate-400">
            Last agreement with{" "}
            <span className="text-slate-200 font-medium">
              {userProgress.lastBenchmarkUsed || "The Ringer"}
            </span>
            :{" "}
            <span className="text-emerald-400 font-bold">
              {userProgress.lastAgreementPercentage}%
            </span>
          </p>
          {currentStreak > 0 && (
            <p className="text-sm text-amber-400 font-semibold mt-1">
              {currentStreak === 1 ? "Keep your streak going!" : `${currentStreak} day streak`}
            </p>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          <button
            onClick={() => setActiveTab("matchups")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "matchups"
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            Daily Matchups
          </button>
          <button
            onClick={() => setActiveTab("rankings")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "rankings"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            Today's Rankings
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
