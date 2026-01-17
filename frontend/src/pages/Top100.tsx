import { useState, useEffect } from "react";
import SortableRankingsTable from "../components/SortableRankingsTable";
import type { PlayerData } from "../components/SortableRankingsTable";
import apiClient from "../api/client";
import FeedbackLink from "../components/FeedbackLink";

type ViewMode = "stats" | "rankings";

interface Column {
  key: keyof PlayerData;
  label: string;
  type: "number" | "string" | "percentage";
  decimals?: number;
  width?: string;
  hideOnMobile?: boolean;
}

const STATS_COLUMNS: Column[] = [
  { key: "rank", label: "#", type: "number", width: "w-12" },
  { key: "name", label: "Player", type: "string", width: "w-48" },
  { key: "team", label: "Team", type: "string", width: "w-20", hideOnMobile: true },
  { key: "position", label: "Pos", type: "string", width: "w-16", hideOnMobile: true },
  { key: "pts", label: "PTS", type: "number", decimals: 1 },
  { key: "reb", label: "REB", type: "number", decimals: 1 },
  { key: "ast", label: "AST", type: "number", decimals: 1 },
  { key: "stl", label: "STL", type: "number", decimals: 1, hideOnMobile: true },
  { key: "blk", label: "BLK", type: "number", decimals: 1, hideOnMobile: true },
  { key: "per", label: "PER", type: "number", decimals: 1 },
];

const RANKINGS_COLUMNS: Column[] = [
  { key: "rank", label: "#", type: "number", width: "w-12" },
  { key: "name", label: "Player", type: "string", width: "w-48" },
  { key: "team", label: "Team", type: "string", width: "w-20", hideOnMobile: true },
  { key: "position", label: "Pos", type: "string", width: "w-16", hideOnMobile: true },
  { key: "compositeScore", label: "Score", type: "number", decimals: 1 },
  { key: "per", label: "PER", type: "number", decimals: 1 },
  { key: "bpm", label: "BPM", type: "number", decimals: 1 },
  { key: "vorp", label: "VORP", type: "number", decimals: 1, hideOnMobile: true },
  { key: "ws", label: "WS", type: "number", decimals: 1, hideOnMobile: true },
];

export default function Top100Page() {
  const [viewMode, setViewMode] = useState<ViewMode>("rankings");
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true);
      setError(null);

      try {
        // Try to load from API
        const response = await apiClient.get("/players/");
        const playersData = response.data;

        // Transform to PlayerData format
        const transformed: PlayerData[] = playersData.map((p: any, idx: number) => ({
          id: p.id,
          name: p.name,
          team: p.team,
          position: p.position,
          rank: idx + 1,
          pts: p.pts_per_game,
          reb: p.trb_per_game,
          ast: p.ast_per_game,
          stl: p.stl_per_game,
          blk: p.blk_per_game,
          per: p.per,
          bpm: p.bpm,
          vorp: p.vorp,
          ws: p.total_ws,
          ts_pct: p.ts_pct,
          compositeScore: p.current_rating,
        }));

        // Sort by current rating (composite score) descending
        transformed.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));

        // Update ranks after sorting
        transformed.forEach((p, idx) => {
          p.rank = idx + 1;
        });

        setPlayers(transformed.slice(0, 100));
      } catch (err) {
        console.error("Failed to load players:", err);
        setError("Failed to load player data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-400 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition"
            >
              Retry
            </button>
            <FeedbackLink variant="compact" className="mt-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Top 100 Players</h1>
        <p className="text-slate-400">
          The GOAT Ladder - ranked by our composite scoring model
        </p>
      </header>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-slate-400">View:</span>
        <div className="flex bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode("rankings")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              viewMode === "rankings"
                ? "bg-emerald-500 text-black"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Rankings
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              viewMode === "stats"
                ? "bg-emerald-500 text-black"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Stats
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={() => {
            // Export to CSV
            const headers = (viewMode === "stats" ? STATS_COLUMNS : RANKINGS_COLUMNS)
              .map((c) => c.label)
              .join(",");
            const rows = players.map((p) => {
              const cols = viewMode === "stats" ? STATS_COLUMNS : RANKINGS_COLUMNS;
              return cols.map((c) => p[c.key] ?? "").join(",");
            });
            const csv = [headers, ...rows].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `top100_${viewMode}_${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
          }}
          className="ml-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition"
        >
          Export CSV
        </button>
      </div>

      {/* Methodology Info */}
      <div className="bg-slate-800/30 rounded-lg p-4 mb-6 text-sm text-slate-400">
        <strong className="text-slate-300">How rankings are calculated:</strong>
        <p className="mt-1">
          Our composite score weights BPM (20%), VORP (18%), WS/48 (18%), PER (12%),
          OBPM/DBPM (8% each), plus adjustments for starter status (8%) and minutes played (8%).
          Stats are normalized to 0-100 percentile scale league-wide.
        </p>
      </div>

      {/* Table */}
      <SortableRankingsTable
        players={players}
        columns={viewMode === "stats" ? STATS_COLUMNS : RANKINGS_COLUMNS}
        pageSize={25}
        showSearch={true}
        showFilters={true}
      />
    </div>
  );
}
