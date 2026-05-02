function StatsBar({ stats }) {
  /** Render the bottom summary bar with claim totals and verdict counts. */
  const items = [
    { label: "Total Claims", value: stats.total_claims ?? 0, tone: "text-white" },
    { label: "True", value: stats.true_count ?? 0, tone: "text-emerald-300" },
    { label: "False", value: stats.false_count ?? 0, tone: "text-rose-300" },
    { label: "Uncertain", value: stats.uncertain_count ?? 0, tone: "text-amber-300" },
  ];

  return (
    <section className="glass-card panel-sheen grid gap-4 rounded-3xl p-6 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="glass-card tilt-card rounded-2xl bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className={`number-glow mt-2 text-2xl font-bold ${item.tone}`}>{item.value}</p>
        </div>
      ))}
    </section>
  );
}

export default StatsBar;
