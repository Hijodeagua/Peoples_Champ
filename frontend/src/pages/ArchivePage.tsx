import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import FeedbackLink from "../components/FeedbackLink";

interface ArchiveEntry {
  date: string;
  players: Array<{id: string; name: string; team: string | null}>;
  total_votes: number;
  is_completed: boolean;
}

interface ArchiveResponse {
  archives: ArchiveEntry[];
  total_days: number;
}

export default function ArchivePage() {
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ArchiveResponse>('/game/archive');
      setArchives(response.data.archives || []);
    } catch (err: unknown) {
      console.error("[ArchivePage] Load error:", err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }, status?: number } };
        const status = axiosErr.response?.status;
        const detail = axiosErr.response?.data?.detail;
        if (status === 404) {
          setError("API endpoint not found. The backend may not be configured correctly.");
        } else if (status === 502 || status === 503) {
          setError("Server is starting up. Please wait 30 seconds and try again.");
        } else if (detail) {
          setError(detail);
        } else {
          setError(`Server error (${status || 'unknown'}). Please try again.`);
        }
      } else if (err instanceof Error) {
        if (err.message.includes('Network Error')) {
          setError("Cannot connect to server. Please check your connection.");
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load archives. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = (date: string) => {
    // Navigate to replay page with the date
    navigate(`/replay/${date}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="text-center space-y-3 mb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-400 font-semibold">
          7-DAY VAULT
        </p>
        <h1 className="text-4xl font-bold">Archive</h1>
        <p className="text-slate-300">
          Replay past daily games from the last 7 days. Your votes still count!
        </p>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
          <div className="text-6xl">📦</div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-200">Couldn't Load Archive</h2>
            <p className="text-slate-400 max-w-md">
              {error}
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              loadArchives();
            }}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition"
          >
            Retry Loading
          </button>
          <p className="text-xs text-slate-500">
            The backend server may be starting up (takes ~30 seconds).
          </p>
          <FeedbackLink variant="compact" className="mt-2" />
        </div>
      ) : (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="mb-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg space-y-2">
          <p className="text-amber-200 text-sm">
            <strong>🔓 Vault Access:</strong> All users can replay games from the past 7 days.
            Click "Replay" to vote on any matchup you missed!
          </p>
          <p className="text-amber-300/70 text-xs">
            <strong>💎 Pro Tip:</strong> Want to see full player stats in the archive? Check out our <span className="text-amber-400 font-semibold">Pro level</span> (coming soon)!
          </p>
        </div>

        <div className="space-y-3">
          {archives.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-4">📅</div>
              <p className="text-lg font-medium">No archived games found.</p>
              <p className="text-sm mt-2">Games will appear here once daily matchups are created.</p>
              <a
                href="/daily"
                className="inline-block mt-4 px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition"
              >
                Play Today's Game
              </a>
            </div>
          ) : (
            archives.map((archive, index) => {
              const formattedDate = new Date(archive.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const playerNames = archive.players.map(p => p.name).join(', ');
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-700 hover:border-slate-600 transition"
                >
                  <div>
                    <p className="font-semibold text-lg">{formattedDate}</p>
                    <p className="text-sm text-slate-400">Players: {playerNames}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {archive.total_votes} votes • {archive.is_completed ? 'Completed' : 'In Progress'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReplay(archive.date)}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition"
                  >
                    Replay
                  </button>
                </div>
              );
            })
          )}
        </div>

        {archives.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-400">
            <p>Showing {archives.length} archived games</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
