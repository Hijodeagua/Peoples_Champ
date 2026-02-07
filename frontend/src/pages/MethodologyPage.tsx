import { Link } from "react-router-dom";

const sections = [
  {
    title: "Data Sources",
    color: "emerald",
    content: (
      <div className="space-y-3">
        <p>
          All player statistics are pulled from{" "}
          <a
            href="https://www.basketball-reference.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline font-medium"
          >
            Basketball Reference
          </a>
          , the most comprehensive and trusted source for NBA statistics.
        </p>
        <p>
          We focus on <strong className="text-slate-100">regular season statistics</strong> from
          recent seasons to determine who is the best player right now. This approach
          captures recent performance while filtering out small sample sizes and recency bias.
        </p>
      </div>
    ),
  },
  {
    title: "The Ringer NBA Top 100",
    color: "emerald",
    content: (
      <div className="space-y-3">
        <p>
          We reference{" "}
          <a
            href="https://nbarankings.theringer.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline font-medium"
          >
            The Ringer&apos;s NBA Top 100
          </a>{" "}
          as an external benchmark for player rankings.
        </p>
        <p>
          The Ringer&apos;s rankings are created by a panel of NBA experts and provide a
          comparison point for our data-driven approach. When you complete the daily game,
          we show how your rankings compare to both our internal model and The Ringer&apos;s
          expert consensus.
        </p>
      </div>
    ),
  },
  {
    title: "ELO and People's Rankings",
    color: "emerald",
    content: (
      <div className="space-y-3">
        <p>
          Our ranking system uses an <strong className="text-slate-100">ELO rating algorithm</strong>{" "}
          similar to those used in chess and competitive gaming. Each player starts with a base
          rating, and their score adjusts based on head-to-head matchup results from user votes.
        </p>
        <p>
          The <strong className="text-slate-100">People&apos;s Rankings</strong> aggregate all user
          choices from the daily game across the entire site. Over time, this creates a
          crowd-sourced ranking that reflects the collective opinion of basketball fans,
          weighted by statistical performance.
        </p>
      </div>
    ),
  },
  {
    title: "Daily Game Format",
    color: "emerald",
    content: (
      <div className="space-y-3">
        <p>
          Each day, we select 5 players and present you with all 10 possible head-to-head
          matchups between them. Your choices reveal your implicit ranking of those 5 players.
        </p>
        <p>
          This pairwise comparison method is more reliable than asking users to rank players
          directly, as it forces concrete decisions between specific players rather than
          abstract rankings.
        </p>
        <p>
          At the end of each daily game, we show how your ranking compares to our ELO model,
          the site-wide People&apos;s Rankings, and The Ringer&apos;s expert rankings.
        </p>
      </div>
    ),
  },
];

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 page-enter">
      <header className="text-center space-y-3 mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 font-semibold">
          BEHIND THE SCENES
        </p>
        <h1 className="text-4xl font-bold">Methodology</h1>
        <p className="text-slate-400 text-sm">
          How we determine who the best player is right now
        </p>
      </header>

      <div className="space-y-6">
        {sections.map(({ title, content }, idx) => (
          <section key={idx} className="card-elevated p-6">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">{title}</h2>
            <div className="text-slate-300 text-sm leading-relaxed">
              {content}
            </div>
          </section>
        ))}

        {/* Feedback Section */}
        <section className="glass rounded-2xl p-6 border-amber-700/30">
          <h2 className="text-xl font-bold text-amber-400 mb-3">Feedback & Bug Reports</h2>
          <div className="text-slate-300 text-sm space-y-3">
            <p>
              Found a bug? Have a feature request? We&apos;d love to hear from you!
            </p>
            <p className="text-slate-500">
              This project is in active development and your feedback helps us improve.
            </p>
            <a
              href="https://forms.gle/xFGFXCDMsxuNAmK57"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold text-sm inline-block"
            >
              Submit Feedback
            </a>
          </div>
        </section>
      </div>

      <div className="text-center pt-8 space-y-3">
        <p className="text-xs text-slate-600">
          This methodology evolves as we gather more data and refine our models.
        </p>
        <Link to="/daily" className="btn-primary text-sm inline-block">
          Play Today&apos;s Game
        </Link>
      </div>
    </div>
  );
}
