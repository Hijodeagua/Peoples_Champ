import { useState } from 'react';
import type { PlayerRanking } from '../data/rankingModel';
import type { AllTimePlayerStats } from '../api/voting';
import type { SimulatedH2HResult } from '../data/simulateH2H';

type MetricOption = 'elo' | 'h2h' | 'ringer';

type Props = {
  rankings: PlayerRanking[];
  h2hVotes?: Map<string, AllTimePlayerStats>;
  simulatedH2H?: Map<string, SimulatedH2HResult>;
  useSimulated?: boolean;
  onAxisChange?: (xAxis: MetricOption, yAxis: MetricOption) => void;
};

export function RankingsScatterPlot({ rankings, h2hVotes, simulatedH2H, useSimulated = true, onAxisChange }: Props) {
  const [hoveredPlayer, setHoveredPlayer] = useState<PlayerRanking | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [xAxis, setXAxisState] = useState<MetricOption>('ringer');
  const [yAxis, setYAxisState] = useState<MetricOption>('h2h');
  
  const setXAxis = (value: MetricOption) => {
    setXAxisState(value);
    onAxisChange?.(value, yAxis);
  };
  
  const setYAxis = (value: MetricOption) => {
    setYAxisState(value);
    onAxisChange?.(xAxis, value);
  };

  const metricLabels: Record<MetricOption, string> = {
    elo: 'Our ELO Model',
    h2h: 'Head-to-Head Score',
    ringer: 'Ringer Rank',
  };

  // For H2H, compute ranks from either simulated or real data
  const h2hRanks = new Map<string, number>();
  
  if (useSimulated && simulatedH2H) {
    // Use simulated H2H ranks directly
    for (const [id, result] of simulatedH2H.entries()) {
      h2hRanks.set(id, result.h2hRank);
    }
  } else if (h2hVotes) {
    // Compute ranks from real vote win rates
    const sortedByWinRate = [...h2hVotes.entries()]
      .filter(([_, stats]) => stats.total_matchups > 0)
      .sort((a, b) => b[1].win_rate - a[1].win_rate);
    sortedByWinRate.forEach(([id], index) => {
      h2hRanks.set(id, index + 1);
    });
  }

  const getDisplayValue = (player: PlayerRanking, metric: MetricOption): number | null => {
    switch (metric) {
      case 'elo':
        return player.rank;
      case 'ringer':
        return player.ringerRank;
      case 'h2h':
        return h2hRanks.get(player.player.id) ?? null;
      default:
        return null;
    }
  };

  // Filter to only players who have both selected metrics
  const data = rankings.filter(r => {
    const xVal = getDisplayValue(r, xAxis);
    const yVal = getDisplayValue(r, yAxis);
    return xVal !== null && yVal !== null;
  });
  
  // Chart dimensions - smaller size
  const width = 400;
  const height = 400;
  const padding = 35;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Scales (1-100 for both)
  const xScale = (rank: number) => padding + ((rank - 1) / 99) * innerWidth;
  const yScale = (rank: number) => padding + ((rank - 1) / 99) * innerHeight;

  return (
    <div className="w-full max-w-md mx-auto bg-slate-800/50 p-4 rounded-xl border border-slate-700">
      <h3 className="text-xl font-bold text-center mb-2">Rankings Comparison</h3>
      
      {/* Axis Selection Controls */}
      <div className="flex flex-wrap justify-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">X-Axis:</label>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value as MetricOption)}
            className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
          >
            <option value="elo">Our ELO Model</option>
            <option value="h2h">Head-to-Head Score</option>
            <option value="ringer">Ringer Rank</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Y-Axis:</label>
          <select
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value as MetricOption)}
            className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
          >
            <option value="elo">Our ELO Model</option>
            <option value="h2h">Head-to-Head Score</option>
            <option value="ringer">Ringer Rank</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center mb-4">
        Comparing {metricLabels[yAxis]} (Y) vs {metricLabels[xAxis]} (X). 
        <span className="text-emerald-400 ml-1">Below</span> = Y higher. 
        <span className="text-red-400 ml-1">Above</span> = Y lower.
      </p>
      
      <div className="relative aspect-square w-full max-w-[400px] mx-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Background Grid */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" strokeWidth="2" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#475569" strokeWidth="2" />
          
          {/* Diagonal Line (Perfect Agreement) */}
          <line 
            x1={padding} 
            y1={padding} 
            x2={width - padding} 
            y2={height - padding} 
            stroke="#334155" 
            strokeWidth="2" 
            strokeDasharray="5,5" 
          />
          <text x={width - padding - 10} y={height - padding - 10} fill="#64748b" fontSize="12" textAnchor="end">Perfect Agreement</text>

          {/* Axis Labels */}
          <text x={width / 2} y={height - 5} fill="#94a3b8" textAnchor="middle" fontSize="14">{metricLabels[xAxis]}</text>
          <text 
            x={15} 
            y={height / 2} 
            fill="#94a3b8" 
            textAnchor="middle" 
            fontSize="14" 
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            {metricLabels[yAxis]}
          </text>

          {/* Ticks */}
          {[1, 25, 50, 75, 100].map(tick => (
            <g key={`tick-${tick}`}>
              {/* X Axis Ticks */}
              <line 
                x1={xScale(tick)} 
                y1={height - padding} 
                x2={xScale(tick)} 
                y2={height - padding + 5} 
                stroke="#64748b" 
              />
              <text x={xScale(tick)} y={height - padding + 20} fill="#64748b" fontSize="10" textAnchor="middle">{tick}</text>
              
              {/* Y Axis Ticks */}
              <line 
                x1={padding - 5} 
                y1={yScale(tick)} 
                x2={padding} 
                y2={yScale(tick)} 
                stroke="#64748b" 
              />
              <text x={padding - 10} y={yScale(tick) + 4} fill="#64748b" fontSize="10" textAnchor="end">{tick}</text>
            </g>
          ))}

          {/* Data Points */}
          {data.map((player) => {
            const xVal = getDisplayValue(player, xAxis)!;
            const yVal = getDisplayValue(player, yAxis)!;
            const cx = xScale(xVal);
            const cy = yScale(yVal);
            const isHovered = hoveredPlayer?.player.id === player.player.id;
            
            // Color based on deviation
            // Green if Y ranks higher (lower number) than X
            // Red if Y ranks lower (higher number) than X
            const diff = yVal - xVal;
            let fill = "#94a3b8"; // neutral
            if (diff < -10) fill = "#34d399"; // Y ranks significantly higher (green)
            if (diff > 10) fill = "#f87171"; // Y ranks significantly lower (red)

            return (
              <circle
                key={player.player.id}
                cx={cx}
                cy={cy}
                r={isHovered ? 8 : 5}
                fill={fill}
                stroke="#1e293b"
                strokeWidth="1"
                className="transition-all duration-200 cursor-pointer hover:opacity-100 opacity-80"
                onMouseEnter={() => {
                  setHoveredPlayer(player);
                  setHoverPos({ 
                    x: cx,
                    y: cy
                  });
                }}
                onMouseLeave={() => setHoveredPlayer(null)}
              />
            );
          })}
          
          {/* Tooltip inside SVG to render on top */}
          {hoveredPlayer && hoverPos && (
            <g transform={`translate(${hoverPos.x}, ${hoverPos.y - 15})`} pointerEvents="none">
              <rect 
                x="-80" 
                y="-70" 
                width="160" 
                height="65" 
                rx="4" 
                fill="#1e293b" 
                stroke="#475569" 
                strokeWidth="1"
                filter="drop-shadow(0 4px 6px rgb(0 0 0 / 0.3))"
              />
              <text x="0" y="-50" textAnchor="middle" fill="#f8fafc" fontWeight="bold" fontSize="12">
                {hoveredPlayer.player.name}
              </text>
              <text x="0" y="-30" textAnchor="middle" fill="#cbd5e1" fontSize="11">
                {metricLabels[xAxis]}: #{getDisplayValue(hoveredPlayer, xAxis)}
              </text>
              <text x="0" y="-15" textAnchor="middle" fill="#cbd5e1" fontSize="11">
                {metricLabels[yAxis]}: #{getDisplayValue(hoveredPlayer, yAxis)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
