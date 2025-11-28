type PercentileBarProps = {
  percentile: number;
};

export default function PercentileBar({ percentile }: PercentileBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
          style={{ width: `${percentile}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 font-medium min-w-[3rem] text-right">
        {percentile}th
      </span>
    </div>
  );
}
