import { useEffect, useState } from "react";
import { getMyVotes } from "../api/game";
import { getGlobalRankings, type GlobalRankingsResponse } from "../api/voting";
import { loadRingerRankings, type RingerRanking } from "../data/loadRingerRankings";
import { recordCompletion, type UserProgress } from "../utils/userProgress";

interface AgreementIndicatorProps {
  /** Force refresh when this changes (e.g., after a vote) */
  refreshKey?: number;
  /** Whether to show sharing buttons */
  showShareButtons?: boolean;
  /** Callback when completion is recorded */
  onCompletionRecorded?: (progress: UserProgress) => void;
}

/**
 * Alternative: Calculate agreement based on global rankings vs Ringer rankings
 * This compares the site's consensus ordering to The Ringer's ordering
 */
function calculateRankingAgreement(
  globalRankings: GlobalRankingsResponse,
  ringerRankings: RingerRanking[]
): number {
  if (!globalRankings.rankings.length || !ringerRankings.length) {
    return 0;
  }

  // Create a map of Ringer rankings by normalized name
  const ringerMap = new Map<string, number>();
  for (const r of ringerRankings) {
    ringerMap.set(r.player.toLowerCase().trim(), r.rank);
  }

  // For each player in global rankings that exists in Ringer, compare positions
  let totalDiff = 0;
  let matchCount = 0;
  const maxRank = Math.max(globalRankings.rankings.length, ringerRankings.length);

  for (let i = 0; i < globalRankings.rankings.length; i++) {
    const player = globalRankings.rankings[i];
    const globalRank = i + 1;
    const playerNameLower = player.name.toLowerCase().trim();
    
    // Try to find in Ringer rankings
    let ringerRank = ringerMap.get(playerNameLower);
    
    // Try partial matching if exact match fails
    if (ringerRank === undefined) {
      for (const [name, rank] of ringerMap.entries()) {
        if (name.includes(playerNameLower) || playerNameLower.includes(name)) {
          ringerRank = rank;
          break;
        }
      }
    }

    if (ringerRank !== undefined) {
      // Calculate normalized difference (0 = perfect match, 1 = max difference)
      const diff = Math.abs(globalRank - ringerRank) / maxRank;
      totalDiff += diff;
      matchCount++;
    }
  }

  if (matchCount === 0) {
    return 0;
  }

  // Convert average difference to agreement percentage
  // 0 diff = 100% agreement, 1 diff = 0% agreement
  const avgDiff = totalDiff / matchCount;
  const agreement = Math.round((1 - avgDiff) * 100);
  return Math.max(0, Math.min(100, agreement));
}

export default function AgreementIndicator({ 
  refreshKey, 
  showShareButtons = true,
  onCompletionRecorded 
}: AgreementIndicatorProps) {
  const [agreement, setAgreement] = useState<number | null>(null);
  const [benchmarkName, setBenchmarkName] = useState<string>("The Ringer's rankings");
  const [loading, setLoading] = useState(true);
  const [hasUserVotes, setHasUserVotes] = useState(false);
  const [topPlayers, setTopPlayers] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    async function loadAgreement() {
      setLoading(true);
      try {
        const [myVotes, globalRankings, ringerRankings] = await Promise.all([
          getMyVotes(),
          getGlobalRankings(),
          loadRingerRankings()
        ]);

        // Check if user has any votes
        const voteCount = Object.keys(myVotes.votes).length;
        setHasUserVotes(voteCount > 0);

        if (voteCount === 0) {
          setAgreement(null);
          setLoading(false);
          return;
        }

        // Get top 5 players from global rankings
        const top5 = globalRankings.rankings.slice(0, 5).map(p => p.name);
        setTopPlayers(top5);

        let finalAgreement = 0;
        let finalBenchmark = "WhosYourGOAT consensus";

        // Try to calculate agreement with Ringer rankings first
        if (ringerRankings.length > 0 && globalRankings.rankings.length > 0) {
          const rankingAgreement = calculateRankingAgreement(globalRankings, ringerRankings);
          if (rankingAgreement > 0) {
            finalAgreement = rankingAgreement;
            finalBenchmark = "The Ringer's rankings";
          }
        }

        // Fall back to WhosYourGOAT consensus if no Ringer agreement
        if (finalAgreement === 0 && globalRankings.rankings.length > 0) {
          let topVotes = 0;
          const topPlayerIds = new Set(
            globalRankings.rankings.slice(0, 3).map((p) => p.id)
          );
          for (const winnerId of Object.values(myVotes.votes)) {
            if (topPlayerIds.has(winnerId)) {
              topVotes++;
            }
          }
          finalAgreement = Math.round((topVotes / voteCount) * 100);
          finalBenchmark = "WhosYourGOAT consensus";
        }

        setAgreement(finalAgreement);
        setBenchmarkName(finalBenchmark);

        // Record completion to localStorage
        if (finalAgreement > 0) {
          const progress = recordCompletion(finalAgreement, finalBenchmark, top5);
          setStreak(progress.streak);
          if (onCompletionRecorded) {
            onCompletionRecorded(progress);
          }
        }
      } catch (err) {
        console.error("Failed to load agreement data:", err);
        setAgreement(null);
      } finally {
        setLoading(false);
      }
    }

    loadAgreement();
  }, [refreshKey, onCompletionRecorded]);

  const handleCopyResults = async () => {
    if (agreement === null) return;

    const shortBenchmark = benchmarkName.includes("Ringer") 
      ? "The Ringer's active player rankings" 
      : "WhosYourGOAT consensus";
    
    const playerList = topPlayers.length > 0 
      ? topPlayers.map(name => name.split(" ").pop()).join(", ") // Use last names
      : "N/A";

    const text = `I agree with ${shortBenchmark} ${agreement}%.
My top 5 active players: ${playerList}.
Who's Your GOAT? https://www.whosyurgoat.app`;

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleShare = async () => {
    if (agreement === null) return;

    const shortBenchmark = benchmarkName.includes("Ringer") 
      ? "The Ringer's active player rankings" 
      : "WhosYourGOAT consensus";
    
    const playerList = topPlayers.length > 0 
      ? topPlayers.map(name => name.split(" ").pop()).join(", ")
      : "N/A";

    const shareData = {
      title: "Who's Your GOAT?",
      text: `I agree with ${shortBenchmark} ${agreement}%.\nMy top 5 active players: ${playerList}.`,
      url: "https://www.whosyurgoat.app"
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        handleCopyResults();
      }
    } else {
      // Native share not available, fall back to copy
      handleCopyResults();
    }
  };

  // Don't show if loading, no votes, or no agreement calculated
  if (loading || !hasUserVotes || agreement === null) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-4 text-center space-y-3">
      <div>
        <p className="text-sm text-slate-400">
          You agree with{" "}
          <span className="text-slate-200 font-medium">{benchmarkName}</span>:
        </p>
        <p className="text-2xl font-bold text-emerald-400 mt-1">{agreement}%</p>
      </div>

      {streak > 1 && (
        <p className="text-sm text-amber-400 font-medium">
          🔥 Streak: {streak} days
        </p>
      )}

      {showShareButtons && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={handleShare}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition w-full sm:w-auto"
          >
            Share your GOAT take
          </button>
          <button
            onClick={handleCopyResults}
            className="px-4 py-2 rounded-lg border border-slate-600 hover:border-slate-500 text-slate-200 text-sm font-medium transition w-full sm:w-auto"
          >
            {copySuccess ? "✓ Copied!" : "Copy results"}
          </button>
        </div>
      )}

      {copySuccess && (
        <p className="text-xs text-emerald-400 animate-pulse">
          Results copied to clipboard!
        </p>
      )}
    </div>
  );
}
