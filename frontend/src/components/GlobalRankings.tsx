import { useCallback, useEffect, useState } from "react";
import { getGlobalRankings, getVotingStatus, type GlobalRankingsResponse, type PlayerRanking, type UserVotesResponse } from "../api/voting";
import AgreementIndicator from "./AgreementIndicator";
import SocialGraphicGenerator from "./SocialGraphicGenerator";

interface GlobalRankingsProps {
  onPlayGame: () => void;
}

function PodiumPlayer({ player, rank, isChamp = false }: { player: PlayerRanking; rank: number; isChamp?: boolean }) {
  const heights = {
    1: "h-32",
    2: "h-24",
    3: "h-20",
  };
  
  const bgColors = {
    1: "bg-gradient-to-t from-yellow-600 to-yellow-400",
    2: "bg-gradient-to-t from-slate-500 to-slate-300",
    3: "bg-gradient-to-t from-amber-700 to-amber-500",
  };
  
  const medals = {
    1: "🥇",
    2: "🥈",
    3: "🥉",
  };

  return (
    <div className={`flex flex-col items-center ${rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}>
      <div className="text-center mb-2">
        {isChamp && rank === 1 && <div className="text-2xl mb-1">👑</div>}
        <p className="text-lg font-bold">{player.name}</p>
        <p className="text-sm text-slate-400">{player.team} • {player.position}</p>
        <p className="text-xs text-slate-500 mt-1">
          {player.wins}-{player.total_matchups - player.wins} ({player.win_percentage}%)
        </p>
      </div>
      <div className={`w-24 ${heights[rank as keyof typeof heights]} ${bgColors[rank as keyof typeof bgColors]} rounded-t-lg flex items-center justify-center`}>
        <span className="text-3xl">{medals[rank as keyof typeof medals]}</span>
      </div>
    </div>
  );
}

function RankingRow({ player, rank }: { player: PlayerRanking; rank: number }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition">
      <span className="w-8 text-center font-bold text-slate-400">#{rank}</span>
      <div className="flex-1">
        <p className="font-semibold">{player.name}</p>
        <p className="text-sm text-slate-400">{player.team} • {player.position}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-emerald-400">{player.wins}-{player.total_matchups - player.wins}</p>
        <p className="text-xs text-slate-500">{player.win_percentage}% win rate</p>
      </div>
      <div className="text-right w-20">
        <p className="text-sm text-slate-300">{player.total_votes_received}</p>
        <p className="text-xs text-slate-500">votes</p>
      </div>
    </div>
  );
}

function PlayFirstModal({ onPlay, onSkip }: { onPlay: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-700">
        <div className="text-5xl mb-4">🏀</div>
        <h2 className="text-2xl font-bold mb-3">Play Today's Matchups First!</h2>
        <p className="text-slate-300 mb-6">
          Vote on today's matchups to see how your picks compare to everyone else's rankings.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onPlay}
            className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg transition"
          >
            Play Daily Game
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition"
          >
            Skip & View Rankings
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GlobalRankings({ onPlayGame }: GlobalRankingsProps) {
  const [rankings, setRankings] = useState<GlobalRankingsResponse | null>(null);
  const [votingStatus, setVotingStatus] = useState<UserVotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [skippedModal, setSkippedModal] = useState(false);
  const [showSocialGraphic, setShowSocialGraphic] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rankingsData, statusData] = await Promise.all([
        getGlobalRankings(),
        getVotingStatus()
      ]);
      setRankings(rankingsData);
      setVotingStatus(statusData);
      
      // Show modal if user hasn't completed matchups
      if (!statusData.completed && !skippedModal) {
        setShowModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rankings");
    } finally {
      setLoading(false);
    }
  }, [skippedModal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSkipModal = () => {
    setShowModal(false);
    setSkippedModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading rankings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!rankings || rankings.rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-2xl font-bold mb-2">No Rankings Yet</h2>
        <p className="text-slate-400">Be the first to vote and establish today's rankings!</p>
      </div>
    );
  }

  const topThree = rankings.rankings.slice(0, 3);

  return (
    <>
      {showModal && (
        <PlayFirstModal onPlay={onPlayGame} onSkip={handleSkipModal} />
      )}
      
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Today's GOAT</h1>
          <p className="text-slate-400">
            Based on {rankings.total_votes} votes from {rankings.total_voters} voters
          </p>
        </div>

        {/* Podium */}
        {topThree.length >= 3 && (
          <div className="flex justify-center items-end gap-4 py-8">
            {topThree.map((player, idx) => (
              <PodiumPlayer 
                key={player.id} 
                player={player} 
                rank={idx + 1}
                isChamp={idx === 0}
              />
            ))}
          </div>
        )}

        {/* Champion highlight */}
        {topThree.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-900/30 via-yellow-600/20 to-yellow-900/30 rounded-xl p-6 text-center border border-yellow-600/30">
            <p className="text-yellow-400 text-sm font-medium mb-1">TODAY'S PEOPLES CHAMP</p>
            <h2 className="text-3xl font-bold">{topThree[0].name}</h2>
            <p className="text-slate-300 mt-1">
              {topThree[0].wins} wins out of {topThree[0].total_matchups} matchups • {topThree[0].total_votes_received} total votes
            </p>
            <button
              onClick={() => setShowSocialGraphic(true)}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition"
            >
              Share Top 5 🏆
            </button>
          </div>
        )}

        {/* Full Rankings */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-300">Full Rankings</h3>
          {rankings.rankings.map((player, idx) => (
            <RankingRow key={player.id} player={player} rank={idx + 1} />
          ))}
        </div>

        {/* Agreement Indicator - shows after user has voted */}
        {votingStatus && votingStatus.votes_today > 0 && (
          <div className="max-w-sm mx-auto">
            <AgreementIndicator />
          </div>
        )}

        {/* User status */}
        {votingStatus && (
          <div className="text-center text-sm text-slate-500 pt-4 border-t border-slate-700">
            {votingStatus.completed ? (
              <span className="text-emerald-400">✓ You've completed all {votingStatus.total_matchups} matchups today</span>
            ) : (
              <span>You've voted on {votingStatus.votes_today} of {votingStatus.total_matchups} matchups</span>
            )}
          </div>
        )}

        {/* Social Graphic Modal */}
        {showSocialGraphic && rankings && (
          <SocialGraphicGenerator
            players={rankings.rankings.slice(0, 5).map(p => ({ name: p.name, team: p.team, position: p.position }))}
            title="Peoples Champ"
            subtitle="Today's Top 5"
            onClose={() => setShowSocialGraphic(false)}
          />
        )}
      </div>
    </>
  );
}
