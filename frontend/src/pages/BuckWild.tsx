export default function BuckWildPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Buck Wild</h1>
      <p className="text-slate-300 text-sm mb-4">
        With the right access code, Buck Wild mode lets you create as many
        custom ranking sessions as you want – for friend groups, podcasts, or
        just arguing about hoopers.
      </p>

      <div className="border border-slate-800 rounded-xl p-4 text-sm text-slate-200">
        <p className="mb-3">
          Future behavior for this page:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Enter an access code to unlock unlimited ranking sessions.</li>
          <li>
            Spin up custom player pools (e.g., &quot;All-time point guards&quot;,
            &quot;2020s Celtics&quot;, etc.).
          </li>
          <li>Generate shareable links for each special session.</li>
        </ul>
      </div>
    </div>
  );
}
