const AI_SOURCES = [
  "ChatGPT (OpenAI)",
  "Gemini (Google)",
  "Claude (Anthropic)",
  "Copilot (Microsoft)",
  "Llama (Meta)",
  "Other AI",
  "Not AI Generated",
];


function TextInput({ value, onChange, onAnalyze, loading, aiSource, onAiSourceChange }) {
  /** Render the main textarea and analyze action for user input. */
  return (
    <section className="glass-card tilt-card panel-sheen rounded-3xl p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Analyze Response</h2>
        <p className="mt-1 text-sm text-slate-400">
          Paste any ChatGPT, Gemini, or Claude output and TruthLens will detect hallucinations sentence by sentence.
        </p>
      </div>

      <div className="mb-5">
        <p className="mb-3 text-sm font-medium text-slate-300">Which AI generated this text?</p>
        <div className="flex flex-wrap gap-2">
          {AI_SOURCES.map((source) => {
            const isSelected = source === aiSource;
            return (
              <button
                key={source}
                type="button"
                onClick={() => onAiSourceChange(source)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? "glow-purple bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
                    : "glass-button text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {source}
              </button>
            );
          })}
        </div>
      </div>

      <label className="mb-3 block text-sm font-medium text-slate-300" htmlFor="truthlens-input">
        AI Response
      </label>
      <textarea
        id="truthlens-input"
        className="min-h-[320px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
        placeholder={`Paste any AI response from ChatGPT, Gemini,
Claude or Copilot here...

Or try:
- Copy a Wikipedia paragraph
- Paste a WhatsApp forward
- Copy any news article text
- Ask me any question directly`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">Sentence-by-sentence hallucination detection with Wikipedia-backed verification.</p>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || !value.trim()}
          className="glow-purple inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:from-violet-400 hover:to-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </section>
  );
}

export default TextInput;
