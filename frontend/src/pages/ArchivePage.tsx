import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

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
        if (status === 502 || status === 503) {
          setError("Server is starting up. Please wait a moment and try again.");
        } else if (detail) {
          setError(detail);
        } else {
          setError(`Server error (${status || 'unknown'}). Please try again.`);
        }
      } else if (err instanceof Error) {
        setError(err.message.includes('Network Error')
          ? "Cannot connect to server. Please check your connection."
          : err.message
        );
      } else {
        setError('Failed to load archives. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = (date: string) => {
    navigate(`/replay/${date}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] page-enter">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-amber-500 mx-auto"></div>
          <p className="text-sm text-slate-500">Loading archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 page-enter">
      <header className="text-center space-y-3 mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400/80 font-semibold">
          7-DAY VAULT
        </p>
        <h1 className="text-4xl font-bold">Archive</h1>
        <p className="text-slate-400 text-sm">
          Replay past daily games from the last 7 days. Your votes still count!
        </p>
      </header>

      {error ? (
        <div className="card-elevated p-8 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-200">Could not load archive</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={() => { setError(null); loadArchives(); }}
            className="btn-gold text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {archives.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-300">No archived games found.</p>
              <p className="text-sm text-slate-500 mt-2">Games will appear here once daily matchups are created.</p>
              <a href="/daily" className="btn-primary text-sm inline-block mt-6">
                Play Today's Game
              </a>
            </div>
          ) : (
            archives.map((archive, index) => {
              const formattedDate = new Date(archive.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const playerNames = archive.players.slice(0, 4).map(p => p.name).join(', ');
              const extraPlayers = archive.players.length > 4 ? ` +${archive.players.length - 4} more` : '';

              return (
                <div
                  key={index}
                  className="card-elevated p-5 hover:border-slate-600/60 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-lg text-slate-200">{formattedDate}</p>
                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {playerNames}{extraPlayers}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                        <span>{archive.total_votes} votes</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          archive.is_completed
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {archive.is_completed ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleReplay(archive.date)}
                      className="btn-gold text-sm px-5 py-2 shrink-0 group-hover:shadow-lg group-hover:shadow-amber-500/10"
                    >
                      Replay
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {archives.length > 0 && (
            <p className="text-center text-xs text-slate-600 pt-4">
              Showing {archives.length} archived games
            </p>
          )}
        </div>
      )}
    </div>
  );
}
