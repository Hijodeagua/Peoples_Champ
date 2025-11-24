export default function Top100Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Top 100 Rankings</h1>
      <p className="text-slate-300 text-sm mb-4">
        This page will show the Peoples Champ ladder – the top 100 players with
        stats from both the rating system and daily game results. You&apos;ll be
        able to sort by rating, team, position, and more.
      </p>

      <div className="border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
        <p>
          For now this is just a placeholder. Next steps here will be:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Define API endpoint that returns the top 100 players.</li>
          <li>
            Show table with rating, PPG, RPG, APG, PER, BPM, and daily game
            performance (wins / losses).
          </li>
          <li>Allow sorting / filtering by different metrics.</li>
        </ul>
      </div>
    </div>
  );
}
