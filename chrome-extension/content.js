const PANEL_ID = "truthlens-side-panel";
const API_URL = "http://localhost:8000/api/analyze";

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getVerdictClass(verdict) {
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

function removeExistingPanel() {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    existing.remove();
  }
}

function createPanelShell() {
  removeExistingPanel();

  const panel = document.createElement("aside");
  panel.id = PANEL_ID;
  panel.className = "truthlens-panel";
  panel.innerHTML = `
    <div class="truthlens-panel-header">
      <div>
        <div class="truthlens-logo-row">
          <div class="truthlens-logo">TL</div>
          <div>
            <h2>TruthLens</h2>
            <p>Instant web fact-checking</p>
          </div>
        </div>
      </div>
      <button class="truthlens-close-button" type="button" aria-label="Close panel">×</button>
    </div>
    <div class="truthlens-panel-body">
      <div class="truthlens-loading">
        <div class="truthlens-spinner"></div>
        <p>Analyzing...</p>
      </div>
    </div>
  `;

  panel.querySelector(".truthlens-close-button")?.addEventListener("click", () => panel.remove());
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add("truthlens-panel-visible"));
  return panel;
}

function renderClaims(result) {
  return (result.claims || [])
    .map((claim) => {
      const correctInfo =
        claim.verdict === "FALSE"
          ? `
            <div class="truthlens-correct-box">
              <div class="truthlens-meta-label">Correct Information</div>
              <p>${escapeHtml(claim.correct_info || "See explanation below.")}</p>
            </div>
          `
          : "";

      const sourceMarkup = claim.source_url
        ? `<a class="truthlens-source-link" href="${escapeHtml(claim.source_url)}" target="_blank" rel="noreferrer">${escapeHtml(claim.source || claim.source_url)}</a>`
        : `<span class="truthlens-source-text">${escapeHtml(claim.source || "General Knowledge")}</span>`;

      return `
        <article class="truthlens-claim-card">
          <div class="truthlens-claim-top">
            <span class="truthlens-badge ${getVerdictClass(claim.verdict)}">${escapeHtml(claim.verdict)}</span>
            <span class="truthlens-confidence">${escapeHtml(String(claim.confidence))}% confidence</span>
          </div>
          <p class="truthlens-claim-text">${escapeHtml(claim.claim || "")}</p>
          ${correctInfo}
          <div class="truthlens-explanation-box">
            <div class="truthlens-meta-label">Explanation</div>
            <p>${escapeHtml(claim.explanation || "")}</p>
          </div>
          <div class="truthlens-explanation-box">
            <div class="truthlens-meta-label">Source</div>
            ${sourceMarkup}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderResult(panel, result) {
  const body = panel.querySelector(".truthlens-panel-body");
  if (!body) return;

  body.innerHTML = `
    <div class="truthlens-score-card">
      <div class="truthlens-score-circle">${escapeHtml(String(result.overall_score ?? 0))}</div>
      <div>
        <div class="truthlens-meta-label">Overall Truth Score</div>
        <p class="truthlens-score-subtitle">${escapeHtml(String(result.total_claims ?? 0))} claims analyzed</p>
      </div>
    </div>
    <div class="truthlens-stats-row">
      <span>True: ${escapeHtml(String(result.true_count ?? 0))}</span>
      <span>False: ${escapeHtml(String(result.false_count ?? 0))}</span>
      <span>Uncertain: ${escapeHtml(String(result.uncertain_count ?? 0))}</span>
    </div>
    <div class="truthlens-claims-list">
      ${renderClaims(result)}
    </div>
  `;
}

function renderError(panel, errorText) {
  const body = panel.querySelector(".truthlens-panel-body");
  if (!body) return;

  body.innerHTML = `
    <div class="truthlens-error-box">
      <h3>TruthLens Error</h3>
      <p>${escapeHtml(errorText)}</p>
    </div>
  `;
}

async function analyzeSelectedText(text) {
  const panel = createPanelShell();

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
    renderResult(panel, result);
  } catch (error) {
    renderError(panel, error.message || "Unable to reach the TruthLens backend.");
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "checkText" && message.text?.trim()) {
    analyzeSelectedText(message.text.trim());
    sendResponse({ ok: true });
  }
});
