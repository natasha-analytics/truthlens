const getVerdictStyle = (verdict) => {
  switch (verdict) {
    case "TRUE":
      return {
        badge: "bg-green-600 text-white",
        border: "border-green-800",
        bar: "bg-green-500",
      };
    case "FALSE":
      return {
        badge: "bg-red-600 text-white",
        border: "border-red-800",
        bar: "bg-red-500",
      };
    case "UNCERTAIN":
      return {
        badge: "bg-yellow-600 text-white",
        border: "border-yellow-800",
        bar: "bg-yellow-500",
      };
    case "OPINION":
      return {
        badge: "bg-purple-600 text-white",
        border: "border-purple-800",
        bar: "bg-purple-500",
      };
    case "UNVERIFIABLE":
      return {
        badge: "bg-gray-600 text-white",
        border: "border-gray-700",
        bar: "bg-slate-500",
      };
    default:
      return {
        badge: "bg-gray-600 text-white",
        border: "border-gray-700",
        bar: "bg-slate-500",
      };
  }
};

function ClaimCard({ claim }) {
  /** Render one claim result with verdict, evidence, correction, and explanation. */
  const verdictStyle = getVerdictStyle(claim.verdict);
  const verificationLabel =
    claim.verification_source === "wikipedia_and_claude"
      ? "Verified via Wikipedia + Claude"
      : claim.verification_source === "classification"
        ? "Verified via classification rules"
        : "Verified via Claude knowledge base";

  return (
    <article className={`glass-card tilt-card panel-sheen rounded-2xl border bg-slate-900/70 p-5 ${verdictStyle.border}`}>
      {claim.is_hallucination ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">
          HALLUCINATED — AI fabricated this
        </div>
      ) : claim.verdict === "TRUE" ? (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/15 px-4 py-3 text-sm font-semibold text-green-100">
          VERIFIED — AI got this right
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm font-medium leading-6 text-slate-100">{claim.claim}</p>
        <span className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${verdictStyle.badge}`}>
          {claim.verdict}
        </span>
      </div>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{verificationLabel}</p>

      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <div className="glass-card rounded-xl bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Confidence</p>
          <p className="mt-1 text-lg font-semibold text-white">{claim.confidence}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800/80">
            <div
              className={`h-full rounded-full ${verdictStyle.bar}`}
              style={{ width: `${Math.max(0, Math.min(100, claim.confidence || 0))}%` }}
            />
          </div>
        </div>

        <div className="glass-card rounded-xl bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Source</p>
          {claim.source_url ? (
            <div className="mt-1">
              <p className="font-medium text-slate-100">{claim.source || "Reliable Source"}</p>
              <a
                className="mt-1 inline-block break-all text-sky-400 hover:text-sky-300"
                href={claim.source_url}
                target="_blank"
                rel="noreferrer"
              >
                {claim.source_url}
              </a>
            </div>
          ) : claim.source ? (
            <p className="mt-1 font-medium text-slate-200">{claim.source}</p>
          ) : (
            <p className="mt-1 text-slate-400">General Knowledge</p>
          )}
        </div>
      </div>

      {claim.verdict === "FALSE" ? (
        <div className="glass-card mt-4 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
          <p className="text-xs uppercase tracking-wide text-orange-300">Correct Information:</p>
          <p className="mt-1 text-sm text-orange-100">{claim.correct_info || "See explanation below."}</p>
        </div>
      ) : null}

      <div className="glass-card mt-4 rounded-xl bg-slate-950/60 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Explanation</p>
        <p className="mt-1 text-sm leading-6 text-slate-200">{claim.explanation}</p>
      </div>
    </article>
  );
}

export default ClaimCard;
