export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Methodology</h1>
      <p className="text-slate-300 text-sm mb-4">
        This section will walk through how GOAT rankings are built –
        both the underlying stats and the game-based adjustments.
      </p>

      <div className="space-y-3 text-sm text-slate-200">
        <p>
          You&apos;ll be able to explain:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>What data source you use (BBRef, play-by-play, etc.).</li>
          <li>
            How base ratings are calculated (e.g., WS, BPM, RAPTOR, custom
            blend).
          </li>
          <li>
            How daily head-to-head picks nudge those ratings (Elo-style
            updates, confidence, volume, etc.).
          </li>
          <li>
            How percentiles for PPG, RPG, APG, BPM, PER are computed relative
            to the league.
          </li>
        </ul>
      </div>
    </div>
  );
}
