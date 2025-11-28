import { useState } from 'react';
import type { PlayerRanking } from '../data/rankingModel';

type Props = {
  rankings: PlayerRanking[];
};

export function RankingsScatterPlot({ rankings }: Props) {
  const [hoveredPlayer, setHoveredPlayer] = useState<PlayerRanking | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Filter to only players who have a Ringer rank for comparison (i.e., in Ringer top 100)
  const data = rankings.filter(r => r.ringerRank !== null && r.ringerRank <= 100);
  
  // Chart dimensions
  const width = 600;
  const height = 600;
  const padding = 40;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // Scales (1-100 for both)
  const xScale = (rank: number) => padding + ((rank - 1) / 99) * innerWidth;
  const yScale = (rank: number) => padding + ((rank - 1) / 99) * innerHeight;

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-800/50 p-6 rounded-xl border border-slate-700">
      <h3 className="text-xl font-bold text-center mb-2">Rankings Comparison</h3>
      <p className="text-sm text-slate-400 text-center mb-6">
        Comparing our model (Y-axis) vs The Ringer (X-axis). 
        <br />
        <span className="text-emerald-400">Below line</span> = We value them higher. 
        <span className="text-red-400 ml-2">Above line</span> = We value them lower.
      </p>
      
      <div className="relative aspect-square w-full max-w-[600px] mx-auto">
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
          <text x={width / 2} y={height - 5} fill="#94a3b8" textAnchor="middle" fontSize="14">Ringer Rank</text>
          <text 
            x={15} 
            y={height / 2} 
            fill="#94a3b8" 
            textAnchor="middle" 
            fontSize="14" 
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            Our Rank
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
            const cx = xScale(player.ringerRank!);
            const cy = yScale(player.rank);
            const isHovered = hoveredPlayer?.player.id === player.player.id;
            
            // Color based on deviation
            // Green if we rank higher (lower number) -> cy < cx
            // Red if we rank lower (higher number) -> cy > cx
            const diff = player.rank - player.ringerRank!;
            let fill = "#94a3b8"; // neutral
            if (diff < -10) fill = "#34d399"; // we rank significantly higher (green)
            if (diff > 10) fill = "#f87171"; // we rank significantly lower (red)

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
                    x: cx, // SVG coordinates
                    y: cy  // SVG coordinates
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
                Our Rank: #{hoveredPlayer.rank}
              </text>
              <text x="0" y="-15" textAnchor="middle" fill="#cbd5e1" fontSize="11">
                Ringer Rank: #{hoveredPlayer.ringerRank}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
