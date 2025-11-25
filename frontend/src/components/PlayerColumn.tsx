import { Player } from "../data/loadPlayersFromCSV";

type PlayerColumnProps = {
  player: Player;
  selected?: boolean;
  onSelect: (playerId: string) => void;
};

const percent = (value: number) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "N/A";

const numberStat = (value: number) =>
  Number.isFinite(value) ? value.toFixed(1) : "N/A";

export default function PlayerColumn({ player, selected, onSelect }: PlayerColumnProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player.id)}
      className={`w-full text-left rounded-xl p-4 shadow border transition hover:bg-gray-100 bg-white/5 backdrop-blur cursor-pointer ${
        selected ? "border-2 border-green-500 bg-green-50 text-gray-900" : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-lg font-semibold">{player.name}</p>
          <p className="text-sm text-slate-400">
            {player.team} • {player.season} • {player.pos}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500 text-black font-semibold">
          WS {numberStat(player.ws)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
        <div className="space-y-1">
          <p>
            <span className="font-semibold text-slate-100">PTS:</span> {numberStat(player.stats.pts)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">AST:</span> {numberStat(player.stats.ast)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">TRB:</span> {numberStat(player.stats.trb)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">STL:</span> {numberStat(player.stats.stl)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">BLK:</span> {numberStat(player.stats.blk)}
          </p>
        </div>
        <div className="space-y-1">
          <p>
            <span className="font-semibold text-slate-100">FG%:</span> {percent(player.stats.fg_pct)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">3P%:</span> {percent(player.stats.three_pct)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">FT%:</span> {percent(player.stats.ft_pct)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">TS%:</span> {percent(player.stats.ts_pct)}
          </p>
          <p>
            <span className="font-semibold text-slate-100">eFG%:</span> {percent(player.stats.efg_pct)}
          </p>
        </div>
      </div>
    </button>
  );
}
