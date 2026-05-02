import { useEffect, useRef, useState } from "react";
import axios from "axios";


const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";


const AI_SOURCES = [
  "ChatGPT (OpenAI)",
  "Gemini (Google)",
  "Claude (Anthropic)",
  "Copilot (Microsoft)",
  "Llama (Meta)",
  "Other AI",
];


function buildApiUrl(path) {
  const baseUrl = API_BASE_URL.trim();
  return baseUrl ? `${baseUrl}${path}` : path;
}


function getAiLabel(aiSource) {
  return (aiSource || "Unknown AI").split(" (")[0];
}


function getMessageIcon(inputType, fallbackIcon) {
  if (fallbackIcon) return fallbackIcon;
  if (inputType === "GREETING") return "👋";
  if (inputType === "GIBBERISH") return "🤔";
  if (inputType === "CODE") return "💻";
  if (inputType === "QUESTION") return "💡";
  if (inputType === "COMMAND") return "ℹ️";
  return "ℹ️";
}


function getVerificationLabel(verificationSource) {
  if (verificationSource === "wikipedia_and_claude") {
    return "Verified via Wikipedia + Claude";
  }
  if (verificationSource === "classification") {
    return "Verified via TruthLens classification";
  }
  return "Verified via Claude knowledge base";
}


function getRiskColor(risk) {
  if (!risk) return "#7F77DD";
  if (risk.includes("NO HAL")) return "#22c55e";
  if (risk.includes("LOW")) return "#22c55e";
  if (risk.includes("MEDIUM")) return "#eab308";
  return "#ef4444";
}


function getRiskSurface(risk) {
  if (!risk) {
    return {
      background: "linear-gradient(135deg, rgba(127,119,221,0.16), rgba(99,102,241,0.1))",
      border: "1px solid rgba(127,119,221,0.28)",
    };
  }
  if (risk.includes("NO HAL") || risk.includes("LOW")) {
    return {
      background: "#0a2a1a",
      border: "1px solid rgba(34,197,94,0.28)",
    };
  }
  if (risk.includes("MEDIUM")) {
    return {
      background: "#2a2a0a",
      border: "1px solid rgba(234,179,8,0.28)",
    };
  }
  return {
    background: "#2a0a0a",
    border: "1px solid rgba(239,68,68,0.28)",
  };
}


function getVerdictStyle(verdict) {
  const styles = {
    TRUE: {
      bg: "rgba(34,197,94,0.15)",
      border: "rgba(34,197,94,0.4)",
      color: "#22c55e",
      label: "✓ VERIFIED",
    },
    FALSE: {
      bg: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.4)",
      color: "#ef4444",
      label: "✗ HALLUCINATED",
    },
    UNCERTAIN: {
      bg: "rgba(234,179,8,0.15)",
      border: "rgba(234,179,8,0.4)",
      color: "#eab308",
      label: "? UNCERTAIN",
    },
    OPINION: {
      bg: "rgba(168,85,247,0.15)",
      border: "rgba(168,85,247,0.4)",
      color: "#a855f7",
      label: "◆ OPINION",
    },
    UNVERIFIABLE: {
      bg: "rgba(100,116,139,0.15)",
      border: "rgba(100,116,139,0.4)",
      color: "#64748b",
      label: "○ UNVERIFIABLE",
    },
  };
  return styles[verdict] || styles.UNVERIFIABLE;
}


function splitMessage(message) {
  const lines = String(message || "").split("\n").filter(Boolean);
  const tipLine = lines.find((line) => line.trim().startsWith("Tip:"));
  const bodyLines = lines.filter((line) => line !== tipLine);
  return { tipLine, bodyLines };
}


export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [text, setText] = useState("");
  const [aiSource, setAiSource] = useState("ChatGPT (OpenAI)");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const analyzerRef = useRef(null);
  const statsRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchHistory();
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchStats();
      fetchLeaderboard();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/stats");
      setStats(res.data);
    } catch {
      setStats(null);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get("/api/history");
      setHistory(res.data.items || []);
    } catch {
      setHistory([]);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get("/api/hallucination-stats");
      setLeaderboard(res.data.stats || []);
    } catch {
      setLeaderboard([]);
    }
  };

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await axios.post(
        "/api/analyze",
        {
          text: text,
          ai_source: aiSource,
        },
        { timeout: 60000 },
      );
      setResults(res.data);
      fetchStats();
      fetchHistory();
      fetchLeaderboard();
    } catch (e) {
      console.error("Analysis error:", e);
      setResults({
        error: true,
        message: e.response?.data?.detail || e.message || "Connection failed. Make sure backend is running.",
      });
    }
    setLoading(false);
  };

  const renderMessageCard = (messageResult) => {
    const icon = getMessageIcon(messageResult.input_type, messageResult.message_icon);
    const title =
      messageResult.input_type === "QUESTION"
        ? "Here's what I found:"
        : (messageResult.message_title || "TruthLens");
    const { tipLine, bodyLines } = splitMessage(messageResult.message);

    return (
      <div
        className="glass-card card-3d fade-in-up"
        style={{
          padding: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          marginTop: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div
            className="pulse-glow"
            style={{
              width: "56px",
              height: "56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              background: "rgba(127,119,221,0.14)",
              fontSize: "26px",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "12px" }}>{title}</div>
            <div style={{ display: "grid", gap: "10px", color: "#cbd5e1", lineHeight: 1.7, fontSize: "14px" }}>
              {bodyLines.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
            <div
              style={{
                marginTop: "18px",
                padding: "14px 16px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              {tipLine || "Tip: You can also paste any AI response above to detect hallucinations in it."}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClaimCard = (claim, index) => {
    const verdict = getVerdictStyle(claim.verdict);
    return (
      <div
        key={`${claim.claim}-${index}`}
        className="glass-card card-3d fade-in-up"
        style={{
          padding: "22px",
          border: `1px solid ${verdict.border}`,
          background: verdict.bg,
          animationDelay: `${index * 0.06}s`,
        }}
      >
        {claim.is_hallucination ? (
          <div
            className="glow-red"
            style={{
              background: "rgba(239,68,68,0.16)",
              color: "#fecaca",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 800,
              marginBottom: "14px",
              letterSpacing: "0.04em",
            }}
          >
            HALLUCINATED — AI fabricated this
          </div>
        ) : claim.verdict === "TRUE" ? (
          <div
            className="glow-green"
            style={{
              background: "rgba(34,197,94,0.16)",
              color: "#bbf7d0",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 800,
              marginBottom: "14px",
              letterSpacing: "0.04em",
            }}
          >
            VERIFIED — AI got this right
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.6 }}>{claim.claim}</div>
            <div style={{ marginTop: "10px", fontSize: "12px", color: "#94a3b8" }}>
              {getVerificationLabel(claim.verification_source)}
            </div>
          </div>
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              background: verdict.bg,
              border: `1px solid ${verdict.border}`,
              color: verdict.color,
              fontSize: "11px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {verdict.label}
          </div>
        </div>

        <div style={{ marginTop: "18px", display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <div
            className="glass-card"
            style={{
              padding: "14px",
              background: "rgba(2,6,23,0.34)",
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Confidence
            </div>
            <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 800, color: verdict.color }}>
              {claim.confidence}%
            </div>
            <div
              style={{
                marginTop: "12px",
                height: "8px",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, claim.confidence || 0))}%`,
                  height: "100%",
                  background: verdict.color,
                  boxShadow: `0 0 16px ${verdict.color}`,
                }}
              />
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              padding: "14px",
              background: "rgba(2,6,23,0.34)",
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Source
            </div>
            <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>
              {claim.source || "Reliable source"}
            </div>
            {claim.source_url ? (
              <a
                href={claim.source_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: "8px",
                  color: "#60a5fa",
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                {claim.source_url}
              </a>
            ) : null}
          </div>
        </div>

        {claim.verdict === "FALSE" ? (
          <div
            className="glass-card"
            style={{
              marginTop: "16px",
              padding: "14px",
              border: "1px solid rgba(251,146,60,0.24)",
              background: "rgba(251,146,60,0.08)",
            }}
          >
            <div style={{ fontSize: "11px", color: "#fdba74", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Correct Information
            </div>
            <div style={{ marginTop: "8px", fontSize: "14px", color: "#ffedd5", lineHeight: 1.7 }}>
              {claim.correct_info || "See explanation below."}
            </div>
          </div>
        ) : null}

        <div
          className="glass-card"
          style={{
            marginTop: "16px",
            padding: "14px",
            background: "rgba(2,6,23,0.34)",
          }}
        >
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Explanation
          </div>
          <div style={{ marginTop: "8px", fontSize: "14px", color: "#cbd5e1", lineHeight: 1.7 }}>
            {claim.explanation}
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results || loading) return null;

    if (results.error) {
      return (
        <div
          className="fade-in-up"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "20px",
            color: "#ef4444",
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>❌ Analysis Failed</div>
          <div style={{ color: "#94a3b8" }}>{results.message}</div>
          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            Make sure the backend is running on localhost:8000
          </div>
        </div>
      );
    }

    return (
      <div className="fade-in-up" style={{ display: "grid", gap: "18px" }}>
        {results.message && (
          <div
            style={{
              background: "rgba(127,119,221,0.08)",
              border: "1px solid rgba(127,119,221,0.2)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "20px",
            }}
          >
            <div style={{ fontSize: "16px", marginBottom: "8px" }}>
              {results.input_type === "QUESTION"
                ? "💡"
                : results.input_type === "CODE"
                  ? "💻"
                  : results.input_type === "GREETING"
                    ? "👋"
                    : "ℹ️"}{" "}
              <span style={{ fontWeight: 600 }}>
                {results.input_type === "QUESTION"
                  ? "Here's what I found:"
                  : results.input_type === "CODE"
                    ? "Code Detected"
                    : results.input_type === "GREETING"
                      ? "Welcome to TruthLens!"
                      : "Note"}
              </span>
            </div>
            <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: "14px", whiteSpace: "pre-line" }}>
              {results.message}
            </p>
          </div>
        )}

        {results.claims && results.claims.length > 0 && (
          <>
            <div
              style={{
                background: `rgba(${
                  results.risk_color === "green"
                    ? "34,197,94"
                    : results.risk_color === "yellow"
                      ? "234,179,8"
                      : "239,68,68"
                },0.08)`,
                border: `1px solid rgba(${
                  results.risk_color === "green"
                    ? "34,197,94"
                    : results.risk_color === "yellow"
                      ? "234,179,8"
                      : "239,68,68"
                },0.2)`,
                borderRadius: "16px",
                padding: "28px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                {results.ai_source} Hallucination Report
              </div>
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: 900,
                  color: getRiskColor(results.risk_level),
                  lineHeight: "1",
                  marginBottom: "8px",
                }}
              >
                {results.hallucination_rate}%
              </div>
              <div style={{ fontSize: "15px", color: "#94a3b8", marginBottom: "20px" }}>Hallucination Rate</div>

              <span
                style={{
                  background: `rgba(${
                    results.risk_color === "green"
                      ? "34,197,94"
                      : results.risk_color === "yellow"
                        ? "234,179,8"
                        : "239,68,68"
                  },0.15)`,
                  color: getRiskColor(results.risk_level),
                  border: `1px solid ${getRiskColor(results.risk_level)}44`,
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                {results.risk_level}
              </span>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: "12px",
                  marginTop: "20px",
                }}
              >
                {[
                  { label: "TOTAL CLAIMS", value: results.total_claims, color: "#94a3b8" },
                  { label: "HALLUCINATED", value: results.hallucinated_count || results.false_count, color: "#ef4444" },
                  { label: "VERIFIED TRUE", value: results.true_count, color: "#22c55e" },
                  { label: "UNCERTAIN", value: results.uncertain_count, color: "#eab308" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "10px",
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "24px", fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px", letterSpacing: "0.05em" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {results.claims.map((claim, i) => {
                const style = getVerdictStyle(claim.verdict);
                return (
                  <div
                    key={i}
                    style={{
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      borderRadius: "12px",
                      padding: "20px",
                      transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: 700, color: style.color, letterSpacing: "0.05em" }}>
                        {style.label}
                      </span>
                      <span style={{ fontSize: "11px", color: "#475569" }}>{claim.confidence}% confidence</span>
                    </div>

                    <div
                      style={{
                        height: "3px",
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: "2px",
                        marginBottom: "12px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${claim.confidence}%`,
                          background: style.color,
                          borderRadius: "2px",
                          transition: "width 1s ease",
                        }}
                      />
                    </div>

                    <p style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "10px" }}>{claim.claim}</p>

                    {claim.correct_info && (
                      <div
                        style={{
                          background: "rgba(234,179,8,0.1)",
                          border: "1px solid rgba(234,179,8,0.2)",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          marginBottom: "10px",
                          fontSize: "13px",
                          color: "#fbbf24",
                        }}
                      >
                        ✓ Correct: {claim.correct_info}
                      </div>
                    )}

                    {claim.explanation && (
                      <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6, marginBottom: "8px" }}>
                        {claim.explanation}
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "8px",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {claim.source_url ? (
                        <a
                          href={claim.source_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: "11px",
                            color: "#7F77DD",
                            textDecoration: "none",
                          }}
                        >
                          {claim.source} ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#475569" }}>{claim.source}</span>
                      )}
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#334155",
                          background: "rgba(255,255,255,0.04)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {claim.verification_source === "wikipedia_and_claude" ? "📚 Wikipedia + Claude" : "🧠 Claude KB"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFooter = () => (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px",
        textAlign: "center",
        color: "#334155",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          background: "linear-gradient(135deg,#7F77DD,#a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "8px",
        }}
      >
        TruthLens
      </div>
      Built with Claude API + Wikipedia + React
      <br />
      Open source LLM Hallucination Detector
    </footer>
  );

  const renderHistory = () => (
    <section
      className="glass-card"
      style={{
        marginTop: "56px",
        padding: "28px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "28px", fontWeight: 800 }}>Recent Analyses</div>
        <div style={{ marginTop: "8px", fontSize: "14px", color: "#64748b" }}>
          Reload any recent hallucination report with one click.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "16px",
        }}
      >
        {history.length ? (
          history.map((item) => (
            <button
              key={item.id}
              type="button"
              className="glass-card card-3d"
              onClick={() => {
                setResults(item);
                setText(item.input_text);
                setAiSource(item.ai_source || aiSource);
                setError("");
                analyzerRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "18px",
                textAlign: "left",
                background: "rgba(255,255,255,0.025)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <div className="gradient-text" style={{ fontWeight: 800, fontSize: "14px" }}>
                  {getAiLabel(item.ai_source)} • {item.hallucination_rate}% hallucination
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : "Saved"}
                </div>
              </div>
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "14px",
                  color: "#cbd5e1",
                  lineHeight: 1.6,
                }}
              >
                {item.input_text}
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px", fontSize: "12px", color: "#94a3b8" }}>
                <span>{item.total_claims} claims</span>
                <span>{item.true_count} true</span>
                <span>{item.false_count} hallucinated</span>
                <span>{item.uncertain_count} uncertain</span>
              </div>
            </button>
          ))
        ) : (
          <div
            className="glass-card"
            style={{
              padding: "18px",
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            No saved analyses yet. Your first TruthLens report will appear here.
          </div>
        )}
      </div>
    </section>
  );

  const renderLeaderboard = () => (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "120px 40px 80px" }}>
      <div
        className="glass-card"
        style={{
          padding: "32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Live Benchmark
            </div>
            <h1 style={{ fontSize: "42px", fontWeight: 900, marginTop: "10px" }} className="gradient-text">
              AI Hallucination Leaderboard
            </h1>
            <p style={{ marginTop: "10px", fontSize: "15px", color: "#94a3b8", maxWidth: "640px", lineHeight: 1.7 }}>
              Based on real TruthLens user analyses. Compare how often each model fabricates facts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="glass-card"
            style={{
              padding: "12px 18px",
              color: "#e2e8f0",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
            }}
          >
            ← Back to Analyzer
          </button>
        </div>

        <div
          className="glass-card"
          style={{
            overflow: "hidden",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["AI Model", "Claims Tested", "Hallucinated", "Rate"].map((head) => (
                  <th
                    key={head}
                    style={{
                      textAlign: "left",
                      padding: "16px 18px",
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.length ? (
                leaderboard.map((row, index) => (
                  <tr
                    key={row.ai_source}
                    style={{
                      borderTop: index ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}
                  >
                    <td style={{ padding: "18px", fontWeight: 700 }}>{row.ai_source}</td>
                    <td style={{ padding: "18px", color: "#cbd5e1" }}>{row.total_claims}</td>
                    <td style={{ padding: "18px", color: "#fca5a5" }}>{row.hallucinated}</td>
                    <td style={{ padding: "18px", color: row.rate > 50 ? "#ef4444" : row.rate > 25 ? "#eab308" : "#22c55e", fontWeight: 800 }}>
                      {row.rate}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: "24px 18px", color: "#94a3b8", textAlign: "center" }}>
                    No leaderboard data yet. Run a few analyses to populate it.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (currentPath === "/leaderboard") {
    return (
      <div style={{ minHeight: "100vh", background: "#030712", fontFamily: "Inter, sans-serif" }}>
        {renderLeaderboard()}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#030712", fontFamily: "Inter, sans-serif" }}>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(3,7,18,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            fontSize: "20px",
            fontWeight: 800,
            background: "linear-gradient(135deg,#7F77DD,#a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          TruthLens
        </button>

        {stats ? (
          <div
            className="glass-card"
            style={{
              fontSize: "12px",
              color: "#64748b",
              background: "rgba(127,119,221,0.1)",
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid rgba(127,119,221,0.2)",
            }}
          >
            {stats.total_claims?.toLocaleString()} claims analyzed
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate("/leaderboard")}
            className="glass-card"
            style={{
              padding: "8px 18px",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.05)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => analyzerRef.current?.scrollIntoView({ behavior: "smooth" })}
            style={{
              background: "linear-gradient(135deg,#7F77DD,#6366f1)",
              color: "white",
              border: "none",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Now →
          </button>
        </div>
      </nav>

      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 40px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "10%",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle,rgba(127,119,221,0.15),transparent)",
            borderRadius: "50%",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            right: "10%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle,rgba(96,165,250,0.12),transparent)",
            borderRadius: "50%",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <div className="glass-card pulse-glow" style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "12px", color: "#a78bfa", fontWeight: 500, marginBottom: "24px", letterSpacing: "0.05em" }}>
          ✦ AI-Powered Hallucination Detector
        </div>

        <h1 style={{ fontSize: "clamp(36px,6vw,72px)", fontWeight: 900, textAlign: "center", lineHeight: 1.1, marginBottom: "24px", maxWidth: "900px" }}>
          Detect Exactly <span className="gradient-text">Where AI Lies</span> to You
        </h1>

        <p style={{ fontSize: "clamp(14px,2vw,18px)", color: "#94a3b8", textAlign: "center", maxWidth: "600px", lineHeight: 1.7, marginBottom: "40px" }}>
          TruthLens fact-checks every sentence in any ChatGPT, Gemini or Claude response using Wikipedia-backed external verification with confidence scores and source links.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginBottom: "60px" }}>
          <button
            type="button"
            onClick={() => analyzerRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="pulse-glow"
            style={{
              background: "linear-gradient(135deg,#7F77DD,#6366f1)",
              color: "white",
              border: "none",
              padding: "14px 32px",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(127,119,221,0.4)",
            }}
          >
            Start Fact-Checking →
          </button>
          <button
            type="button"
            onClick={() => statsRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="glass-card"
            style={{
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "14px 32px",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            View Accuracy Report
          </button>
        </div>

        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { value: stats?.total_claims?.toLocaleString() || "0", label: "Claims Analyzed" },
            { value: `${Math.round(stats?.accuracy_rate || 0)}%`, label: "Accuracy Rate" },
            { value: "< 3s", label: "Response Time" },
            { value: String(stats?.ai_models_tested || 0), label: "AI Models Tested" },
          ].map((stat, i) => (
            <div key={i} className="floating" style={{ textAlign: "center", animationDelay: `${i * 0.2}s` }}>
              <div className="gradient-text" style={{ fontSize: "28px", fontWeight: 800 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "80px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "36px", fontWeight: 800, textAlign: "center", marginBottom: "12px" }}>How TruthLens Works</h2>
        <p style={{ color: "#64748b", textAlign: "center", marginBottom: "48px", fontSize: "15px" }}>
          Three steps to catch AI hallucinations
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "20px" }}>
          {[
            {
              step: "01",
              icon: "📋",
              title: "Paste AI Response",
              desc: "Copy any ChatGPT, Gemini or Claude response. Select which AI generated it.",
              color: "#7F77DD",
            },
            {
              step: "02",
              icon: "🔍",
              title: "AI Verifies Claims",
              desc: "Each sentence is extracted and cross-referenced against Wikipedia and Claude knowledge.",
              color: "#60a5fa",
            },
            {
              step: "03",
              icon: "✅",
              title: "Get Hallucination Report",
              desc: "See exactly which claims are TRUE, FALSE or UNCERTAIN with a hallucination rate.",
              color: "#22c55e",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="glass-card card-3d"
              style={{
                padding: "28px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: item.color, letterSpacing: "0.1em", marginBottom: "12px" }}>
                STEP {item.step}
              </div>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{item.icon}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>{item.title}</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section ref={statsRef} style={{ padding: "0 40px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div className="glass-card" style={{ padding: "28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "18px" }}>
            {[
              { value: stats?.total_claims?.toLocaleString() || "0", label: "Claims verified against Wikipedia" },
              { value: `${stats?.accuracy_rate?.toFixed ? stats.accuracy_rate.toFixed(1) : 0}%`, label: "Accuracy rate" },
              { value: String(stats?.ai_models_tested || 0), label: "AI models tested" },
              { value: `${stats?.average_hallucination_rate?.toFixed ? stats.average_hallucination_rate.toFixed(1) : 0}%`, label: "Average hallucination rate detected" },
            ].map((item) => (
              <div key={item.label} className="glass-card card-3d" style={{ padding: "18px" }}>
                <div className="gradient-text" style={{ fontSize: "30px", fontWeight: 800 }}>{item.value}</div>
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={analyzerRef} style={{ padding: "80px 40px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "32px", fontWeight: 800, textAlign: "center", marginBottom: "8px" }}>Try TruthLens Now</h2>
        <p style={{ color: "#64748b", textAlign: "center", marginBottom: "40px" }}>Free. No signup. Instant results.</p>

        <div className="gradient-border" style={{ padding: "1px", borderRadius: "18px" }}>
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Which AI generated this text?
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {AI_SOURCES.map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setAiSource(source)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: "20px",
                      border: aiSource === source ? "1px solid #7F77DD" : "1px solid rgba(255,255,255,0.08)",
                      background: aiSource === source ? "rgba(127,119,221,0.2)" : "rgba(255,255,255,0.03)",
                      color: aiSource === source ? "#a78bfa" : "#64748b",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: "relative", marginBottom: "16px" }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste any ${aiSource} response here...\n\nOr try:\n• Copy a Wikipedia paragraph\n• Paste a WhatsApp forward\n• Ask me any question directly`}
                style={{
                  width: "100%",
                  minHeight: "180px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  padding: "16px",
                  fontSize: "14px",
                  fontFamily: "Inter, sans-serif",
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.6,
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(127,119,221,0.5)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={analyze}
                disabled={loading || !text.trim()}
                className={!loading && text.trim() ? "pulse-glow" : ""}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: loading ? "rgba(127,119,221,0.3)" : "linear-gradient(135deg,#7F77DD,#6366f1)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 0 30px rgba(127,119,221,0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                {loading ? "Analyzing..." : `Analyze ${aiSource} →`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setResults(null);
                  setError("");
                }}
                className="glass-card"
                style={{
                  padding: "14px 20px",
                  background: "rgba(255,255,255,0.04)",
                  color: "#64748b",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>

            {error ? (
              <div
                className="glass-card"
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  background: "rgba(127,29,29,0.35)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#fecaca",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            ) : null}

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid rgba(127,119,221,0.2)",
                    borderTop: "3px solid #7F77DD",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <p>Analyzing claims with Wikipedia verification...</p>
              </div>
            ) : null}

            {renderResults()}
          </div>
        </div>

        {renderHistory()}
      </section>

      {renderFooter()}
    </div>
  );
}
