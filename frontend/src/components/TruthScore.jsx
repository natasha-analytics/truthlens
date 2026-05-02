import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

function TruthScore({ score }) {
  /** Render a circular truth score indicator using Recharts. */
  const normalizedScore = Number.isFinite(score) ? score : 0;
  const scoreColor =
    normalizedScore >= 80 ? "#22c55e" : normalizedScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <section className="glass-card tilt-card panel-sheen rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Truth Score</h2>
          <p className="mt-1 text-sm text-slate-400">Overall confidence in the pasted response.</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
        >
          {normalizedScore >= 80 ? "Reliable" : normalizedScore >= 50 ? "Mixed" : "Risky"}
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            barSize={18}
            data={[{ name: "Truth Score", value: normalizedScore, fill: scoreColor }]}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={18} />
            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-100 text-5xl font-bold">
              {normalizedScore}
            </text>
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-sm">
              / 100
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default TruthScore;
