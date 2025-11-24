import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-10">
      {/* Center “logo” for now – we can swap for real SVG later */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center rounded-full border border-emerald-400 px-6 py-3">
          <span className="text-3xl mr-2">🏆</span>
          <div className="text-left">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">
              The Peoples
            </div>
            <div className="text-2xl font-extrabold leading-none">
              Champ
            </div>
          </div>
        </div>
      </div>

      <p className="max-w-xl text-slate-200 text-sm sm:text-base mb-8">
        A daily head-to-head NBA ranking game. You pick the better player in
        each matchup. The crowd decides who&apos;s really the champ.
      </p>

      {/* Daily Rank button */}
      <Link
        to="/play"
        className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm shadow-lg"
      >
        <span className="text-xl">🏀</span>
        <span className="flex flex-col items-start">
          <span>Daily Rank</span>
          <span className="text-xs font-normal">
            Rank today&apos;s 5 players in 10 matchups.
          </span>
        </span>
      </Link>

      {/* Small explainer under button */}
      <div className="mt-8 text-xs text-slate-400 max-w-md">
        Or explore:
        <ul className="mt-2 space-y-1">
          <li>
            <Link to="/top-100" className="text-emerald-300 underline">
              Top 100 Rankings
            </Link>{" "}
            – see the people&apos;s ladder for the whole league.
          </li>
          <li>
            <Link to="/methodology" className="text-emerald-300 underline">
              Methodology
            </Link>{" "}
            – how the math and data behind the rankings work.
          </li>
          <li>
            <Link to="/buck-wild" className="text-emerald-300 underline">
              Buck Wild
            </Link>{" "}
            – create as many custom rankings as you want with an access code.
          </li>
        </ul>
      </div>
    </div>
  );
}
