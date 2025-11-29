import { useState, useEffect } from "react";
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

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    try {
      setLoading(true);
      const response = await api.get<ArchiveResponse>('/game/archive');
      setArchives(response.data.archives);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archives');
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = (date: string) => {
    // TODO: Implement replay functionality
    alert(`Replay for ${date} coming soon!`);
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
        <h1 className="text-4xl font-bold">Archive</h1>
        <p className="text-slate-300">
          Replay past daily games and see how you ranked players on previous days
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-900/40 border border-red-700 text-red-200 rounded-lg text-center">
          {error}
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
          {archives.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>No archived games found.</p>
              <p className="text-sm mt-2">Games will appear here after you play daily matchups.</p>
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
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition"
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
    </div>
  );
}
