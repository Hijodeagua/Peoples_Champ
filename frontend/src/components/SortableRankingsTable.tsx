import { useState, useMemo } from "react";

export interface PlayerData {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
  // Stats
  pts?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  // Advanced
  per?: number;
  ws?: number;
  bpm?: number;
  vorp?: number;
  ts_pct?: number;
  // Rankings
  rank?: number;
  compositeScore?: number;
  // Daily game stats
  wins?: number;
  losses?: number;
  totalVotes?: number;
}

type SortKey = keyof PlayerData;
type SortDirection = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  type: "number" | "string" | "percentage";
  decimals?: number;
  width?: string;
  hideOnMobile?: boolean;
}

interface SortableRankingsTableProps {
  players: PlayerData[];
  columns?: Column[];
  pageSize?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  title?: string;
}

const DEFAULT_COLUMNS: Column[] = [
  { key: "rank", label: "#", type: "number", width: "w-12" },
  { key: "name", label: "Player", type: "string", width: "w-48" },
  { key: "team", label: "Team", type: "string", width: "w-20", hideOnMobile: true },
  { key: "position", label: "Pos", type: "string", width: "w-16", hideOnMobile: true },
  { key: "pts", label: "PTS", type: "number", decimals: 1 },
  { key: "reb", label: "REB", type: "number", decimals: 1, hideOnMobile: true },
  { key: "ast", label: "AST", type: "number", decimals: 1, hideOnMobile: true },
  { key: "per", label: "PER", type: "number", decimals: 1 },
  { key: "bpm", label: "BPM", type: "number", decimals: 1, hideOnMobile: true },
  { key: "compositeScore", label: "Score", type: "number", decimals: 1 },
];

const POSITIONS = ["All", "G", "F", "C", "PG", "SG", "SF", "PF"];

export default function SortableRankingsTable({
  players,
  columns = DEFAULT_COLUMNS,
  pageSize = 25,
  showSearch = true,
  showFilters = true,
  title,
}: SortableRankingsTableProps) {
  // State
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  // Get unique teams for filter
  const teams = useMemo(() => {
    const teamSet = new Set(players.map((p) => p.team).filter(Boolean));
    return ["All", ...Array.from(teamSet).sort()];
  }, [players]);
  const [teamFilter, setTeamFilter] = useState("All");

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = player.name.toLowerCase().includes(query);
        const teamMatch = player.team?.toLowerCase().includes(query);
        if (!nameMatch && !teamMatch) return false;
      }

      // Position filter
      if (positionFilter !== "All") {
        if (!player.position?.includes(positionFilter)) return false;
      }

      // Team filter
      if (teamFilter !== "All") {
        if (player.team !== teamFilter) return false;
      }

      return true;
    });
  }, [players, searchQuery, positionFilter, teamFilter]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      // Handle nulls
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare
      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = (aVal as number) - (bVal as number);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredPlayers, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedPlayers.length / itemsPerPage);
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPlayers.slice(start, start + itemsPerPage);
  }, [sortedPlayers, currentPage, itemsPerPage]);

  // Handle sort click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Default to descending for numbers, ascending for strings
      const col = columns.find((c) => c.key === key);
      setSortDirection(col?.type === "string" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  // Format value for display
  const formatValue = (value: any, column: Column): string => {
    if (value == null) return "—";

    if (column.type === "percentage") {
      return `${(value * 100).toFixed(column.decimals ?? 1)}%`;
    }

    if (column.type === "number" && typeof value === "number") {
      return value.toFixed(column.decimals ?? 0);
    }

    return String(value);
  };

  // Sort indicator
  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <span className="text-slate-600 ml-1">↕</span>;
    }
    return (
      <span className="text-emerald-400 ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with title and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {title && <h2 className="text-xl font-bold">{title}</h2>}

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          {showSearch && (
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
            />
          )}

          {/* Filters */}
          {showFilters && (
            <>
              <select
                value={positionFilter}
                onChange={(e) => {
                  setPositionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos === "All" ? "All Positions" : pos}
                  </option>
                ))}
              </select>

              <select
                value={teamFilter}
                onChange={(e) => {
                  setTeamFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[140px]"
              >
                {teams.map((team) => (
                  <option key={team} value={team as string}>
                    {team === "All" ? "All Teams" : team}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-400">
        Showing {paginatedPlayers.length} of {filteredPlayers.length} players
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`px-3 py-3 text-left font-semibold text-slate-300 cursor-pointer hover:bg-slate-700/50 transition select-none ${
                    column.width || ""
                  } ${column.hideOnMobile ? "hidden md:table-cell" : ""}`}
                >
                  <div className="flex items-center">
                    {column.label}
                    <SortIndicator columnKey={column.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {paginatedPlayers.map((player, idx) => (
              <tr
                key={player.id}
                className={`hover:bg-slate-700/30 transition ${
                  idx % 2 === 0 ? "bg-slate-800/30" : "bg-slate-800/10"
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-3 ${
                      column.hideOnMobile ? "hidden md:table-cell" : ""
                    } ${
                      column.key === "name"
                        ? "font-medium text-white"
                        : "text-slate-300"
                    }`}
                  >
                    {column.key === "rank" && player.rank && player.rank <= 3 ? (
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          player.rank === 1
                            ? "bg-yellow-500 text-black"
                            : player.rank === 2
                            ? "bg-slate-400 text-black"
                            : "bg-amber-600 text-black"
                        }`}
                      >
                        {player.rank}
                      </span>
                    ) : (
                      formatValue(player[column.key], column)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition"
            >
              Prev
            </button>

            <span className="px-3 py-1 text-sm text-slate-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {paginatedPlayers.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">No players found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
