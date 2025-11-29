import { type Player } from "../data/loadPlayersFromCSV";
import PercentileBar from "./PercentileBar";

type PlayerColumnProps = {
  player: Player;
  selected?: boolean;
  onSelect: (playerId: string) => void;
  statDescriptions?: Record<string, string>;
};

const percent = (value: number) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "N/A";

const perGame = (value: number) =>
  Number.isFinite(value) ? value.toFixed(1) : "N/A";

export default function PlayerColumn({ player, selected, onSelect, statDescriptions }: PlayerColumnProps) {
  const StatRow = ({ label, value, percentile }: { label: string; value: string; percentile?: number }) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span 
          className="font-semibold text-slate-100 text-xs cursor-help" 
          title={statDescriptions?.[label] ?? ""}
        >
          {label}:
        </span>
        <span className="text-sm">{value}</span>
      </div>
      {percentile !== undefined && <PercentileBar percentile={percentile} />}
    </div>
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(player.id)}
      className={`w-full text-left rounded-xl p-5 shadow border transition hover:bg-slate-800/50 bg-slate-800/30 backdrop-blur cursor-pointer ${
        selected ? "border-2 border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xl font-bold">{player.name}</p>
          <p className="text-sm text-slate-400">
            {player.team} • {player.season} • {player.pos}
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500 text-black font-bold">
          WS {perGame(player.ws)}
        </span>
      </div>

      <div className="space-y-3 text-slate-200">
        <StatRow 
          label="PPG" 
          value={perGame(player.stats.pts)} 
          percentile={player.percentiles?.pts} 
        />
        <StatRow 
          label="APG" 
          value={perGame(player.stats.ast)} 
          percentile={player.percentiles?.ast} 
        />
        <StatRow 
          label="RPG" 
          value={perGame(player.stats.trb)} 
          percentile={player.percentiles?.trb} 
        />
        <StatRow 
          label="SPG" 
          value={perGame(player.stats.stl)} 
          percentile={player.percentiles?.stl} 
        />
        <StatRow 
          label="BPG" 
          value={perGame(player.stats.blk)} 
          percentile={player.percentiles?.blk} 
        />
        
        <div className="border-t border-slate-700 pt-3 mt-3">
          <StatRow 
            label="FG%" 
            value={percent(player.stats.fg_pct)} 
            percentile={player.percentiles?.fg_pct} 
          />
          <div className="mt-3">
            <StatRow 
              label="3P%" 
              value={percent(player.stats.three_pct)} 
              percentile={player.percentiles?.three_pct} 
            />
          </div>
          <div className="mt-3">
            <StatRow 
              label="FT%" 
              value={percent(player.stats.ft_pct)} 
              percentile={player.percentiles?.ft_pct} 
            />
          </div>
          <div className="mt-3">
            <StatRow 
              label="TS%" 
              value={percent(player.stats.ts_pct)} 
              percentile={player.percentiles?.ts_pct} 
            />
          </div>
          <div className="mt-3">
            <StatRow 
              label="eFG%" 
              value={percent(player.stats.efg_pct)} 
              percentile={player.percentiles?.efg_pct} 
            />
          </div>
        </div>
      </div>
    </button>
  );
}
