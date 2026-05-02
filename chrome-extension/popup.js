const API_URL = "http://localhost:8000/api/analyze";

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBadgeClass(verdict) {
  switch (verdict) {
    case "TRUE":
      return "truthlens-badge-true";
    case "FALSE":
      return "truthlens-badge-false";
    case "UNCERTAIN":
      return "truthlens-badge-uncertain";
    case "OPINION":
      return "truthlens-badge-opinion";
    default:
      return "truthlens-badge-unverifiable";
  }
}

function setStatus(message, loading = false) {
  const status = document.getElementById("truthlens-status");
  if (!status) return;

  if (!message) {
    status.innerHTML = "";
    return;
  }

  status.innerHTML = loading
    ? `<div class="truthlens-loading-inline"><div class="truthlens-spinner small"></div><span>${escapeHtml(message)}</span></div>`
    : `<div class="truthlens-popup-notice">${escapeHtml(message)}</div>`;
}

function renderResults(result) {
  const results = document.getElementById("truthlens-results");
  if (!results) return;

  const claims = (result.claims || [])
    .map((claim) => {
      const correctInfo =
        claim.verdict === "FALSE"
          ? `<div class="truthlens-correct-box"><div class="truthlens-meta-label">Correct Information</div><p>${escapeHtml(
              claim.correct_info || "See explanation below.",
            )}</p></div>`
          : "";

      const source = claim.source_url
        ? `<a class="truthlens-source-link" href="${escapeHtml(claim.source_url)}" target="_blank" rel="noreferrer">${escapeHtml(
            claim.source || claim.source_url,
          )}</a>`
        : `<span class="truthlens-source-text">${escapeHtml(claim.source || "General Knowledge")}</span>`;

      return `
        <article class="truthlens-claim-card">
          <div class="truthlens-claim-top">
            <span class="truthlens-badge ${getBadgeClass(claim.verdict)}">${escapeHtml(claim.verdict)}</span>
            <span class="truthlens-confidence">${escapeHtml(String(claim.confidence))}%</span>
          </div>
          <p class="truthlens-claim-text">${escapeHtml(claim.claim || "")}</p>
          ${correctInfo}
          <div class="truthlens-explanation-box">
            <div class="truthlens-meta-label">Explanation</div>
            <p>${escapeHtml(claim.explanation || "")}</p>
          </div>
          <div class="truthlens-explanation-box">
            <div class="truthlens-meta-label">Source</div>
            ${source}
          </div>
        </article>
      `;
    })
    .join("");

  results.innerHTML = `
    <section class="truthlens-score-card popup">
      <div class="truthlens-score-circle">${escapeHtml(String(result.overall_score ?? 0))}</div>
      <div>
        <div class="truthlens-meta-label">Overall Truth Score</div>
        <p class="truthlens-score-subtitle">${escapeHtml(String(result.total_claims ?? 0))} claims analyzed</p>
      </div>
    </section>
    <div class="truthlens-stats-row">
      <span>True: ${escapeHtml(String(result.true_count ?? 0))}</span>
      <span>False: ${escapeHtml(String(result.false_count ?? 0))}</span>
      <span>Uncertain: ${escapeHtml(String(result.uncertain_count ?? 0))}</span>
    </div>
    <div class="truthlens-claims-list">${claims}</div>
  `;
}

async function analyzeText() {
  const input = document.getElementById("truthlens-input");
  const button = document.getElementById("truthlens-analyze");
  const text = input?.value?.trim() || "";

  if (!text) {
    setStatus("Paste some text first.");
    return;
  }

  button.disabled = true;
  setStatus("Analyzing...", true);
  renderResults({ claims: [], total_claims: 0, overall_score: 0, true_count: 0, false_count: 0, uncertain_count: 0 });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const result = await response.json();
    setStatus("");
    renderResults(result);
  } catch (error) {
    setStatus(error.message || "Unable to reach the TruthLens backend.");
  } finally {
    button.disabled = false;
  }
}

document.getElementById("truthlens-analyze")?.addEventListener("click", analyzeText);
