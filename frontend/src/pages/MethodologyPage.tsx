export default function MethodologyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="text-center space-y-3 mb-10">
        <h1 className="text-4xl font-bold">Methodology</h1>
        <p className="text-slate-300">
          How we determine who the best player is right now
        </p>
      </header>

      <div className="space-y-8 text-slate-200">
        <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-emerald-400">Data Sources</h2>
          <div className="space-y-3">
            <p>
              All player statistics are pulled from{" "}
              <a
                href="https://www.basketball-reference.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Basketball Reference
              </a>
              , the most comprehensive and trusted source for NBA statistics.
            </p>
            <p>
              We focus exclusively on <strong>regular season statistics</strong> from the{" "}
              <strong>two seasons prior to the current year</strong>. This approach captures recent
              performance while filtering out small sample sizes and recency bias.
            </p>
            <p>
              As of November 2024, we are analyzing data from the 2023-24 and 2024-25 seasons to
              determine who is the best player right now.
            </p>
          </div>
        </section>

        <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-emerald-400">The Ringer NBA Top 100</h2>
          <div className="space-y-3">
            <p>
              We also reference{" "}
              <a
                href="https://nbarankings.theringer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                The Ringer's NBA Top 100
              </a>{" "}
              as an external benchmark for player rankings.
            </p>
            <p>
              The Ringer's rankings are created by a panel of NBA experts and provide a valuable
              comparison point for our data-driven approach. When you complete the daily game, we'll
              show how your rankings compare to both our internal model and The Ringer's expert
              consensus.
            </p>
          </div>
        </section>

        <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-emerald-400">ELO and Peoples Rankings</h2>
          <div className="space-y-3">
            <p>
              Our ranking system uses an <strong>ELO rating algorithm</strong> similar to those used
              in chess and competitive gaming. Each player starts with a base rating, and their
              score adjusts based on head-to-head matchup results from user votes.
            </p>
            <p>
              The <strong>Peoples Rankings</strong> aggregate all user choices from the daily game
              across the entire site. Over time, this creates a crowd-sourced ranking that reflects
              the collective opinion of basketball fans, weighted by statistical performance.
            </p>
            <p>
              By combining internal ELO calculations with aggregate user data, we create a dynamic
              ranking system that balances statistical excellence with subjective evaluation—just
              like real NBA debates.
            </p>
          </div>
        </section>

        <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-emerald-400">Daily Game Format</h2>
          <div className="space-y-3">
            <p>
              Each day, we select 5 players and present you with all 10 possible head-to-head
              matchups between them. Your choices reveal your implicit ranking of those 5 players.
            </p>
            <p>
              This pairwise comparison method is more reliable than asking users to rank players
              directly, as it forces you to make concrete decisions between specific players rather
              than abstract rankings.
            </p>
            <p>
              At the end of each daily game, we show you how your ranking compares to our ELO model,
              the site-wide Peoples Rankings, and The Ringer's expert rankings.
            </p>
          </div>
        </section>

        <div className="text-center text-sm text-slate-400 pt-6">
          <p>
            Questions or feedback? This methodology will continue to evolve as we gather more data
            and refine our models.
          </p>
        </div>
      </div>
    </div>
  );
}
