# TruthLens

TruthLens is a full-stack LLM hallucination detector that breaks AI-generated responses into individual factual claims, checks each claim against Wikipedia-backed reference content using Claude, and returns a truth confidence score with evidence.

## Features

- Sentence-by-sentence claim extraction using Claude
- Wikipedia retrieval for claim grounding
- Claim verdicts: `TRUE`, `FALSE`, `UNCERTAIN`, `UNVERIFIABLE`
- Overall truth scoring from 0-100
- SQLite persistence for analysis history
- React + Tailwind frontend with circular truth score visualization
- FastAPI backend with health, analysis, and history endpoints

## Tech Stack

- Backend: FastAPI, SQLAlchemy, SQLite, `httpx`, `wikipedia-api`
- Frontend: React, Vite, TailwindCSS, Axios, Recharts
- LLM: Anthropic Claude Messages API using `claude-sonnet-4-20250514`

## Project Structure

```text
truthlens/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── analyzer/
│   │   ├── claim_extractor.py
│   │   ├── fact_checker.py
│   │   └── scorer.py
│   ├── api/
│   │   └── routes.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── TextInput.jsx
│   │   │   ├── ClaimCard.jsx
│   │   │   ├── TruthScore.jsx
│   │   │   └── StatsBar.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

## Environment

The project includes a root `.env` file and a frontend `.env` file.

Current defaults:

```env
DATABASE_URL=sqlite:///./truthlens.db
CORS_ORIGINS=http://localhost:5173
ANTHROPIC_API_URL=https://api.anthropic.com/v1/messages
ANTHROPIC_MODEL=claude-sonnet-4-20250514
WIKIPEDIA_USER_AGENT=TruthLens/1.0
VITE_API_BASE_URL=
```

If your Claude environment injects credentials automatically, no further setup is required. If it does not, set `ANTHROPIC_API_KEY` in `.env`.

## Backend API

### `GET /api/health`

Returns:

```json
{"status": "TruthLens running"}
```

### `POST /api/analyze`

Request:

```json
{"text": "The Eiffel Tower was built in 1889. It is 400 meters tall. It is located in London."}
```

Response shape:

```json
{
  "id": 1,
  "input_text": "The Eiffel Tower was built in 1889. It is 400 meters tall.",
  "overall_score": 48,
  "true_count": 1,
  "false_count": 1,
  "uncertain_count": 0,
  "unverifiable_count": 0,
  "total_claims": 2,
  "problematic_claims": ["The Eiffel Tower is 400 meters tall"],
  "claims": [
    {
      "id": 1,
      "claim": "The Eiffel Tower was built in 1889",
      "verdict": "TRUE",
      "confidence": 96,
      "correct_info": "",
      "source": "https://en.wikipedia.org/wiki/Eiffel_Tower",
      "explanation": "Wikipedia confirms the tower opened in 1889."
    }
  ]
}
```

### `GET /api/history`

Returns the 10 most recent analyses with nested claim results.

## How It Works

1. The user pastes AI-generated text into the frontend.
2. The backend sends the claim-extraction prompt to Claude.
3. Each extracted claim first tries the required first-four-words lookup and then falls back to Wikipedia search for better coverage.
4. Wikipedia summary text is passed to Claude with the fact-check prompt.
5. The backend aggregates claim verdicts into a single truth score.
6. The full result is stored in SQLite and returned to the frontend.

## Error Handling

- Empty input returns `400`
- No extractable claims returns `422`
- Claim extraction failures return `502`
- Missing Wikipedia content returns `UNVERIFIABLE`
- Claude request or JSON parse failures return `UNVERIFIABLE` per claim

## Exact Windows Run Commands

### 1. Create a virtual environment

```powershell
cd truthlens
python -m venv .venv
```

### 2. Activate the virtual environment

```powershell
.venv\Scripts\activate
```

### 3. Install all Python packages

```powershell
pip install -r backend\requirements.txt
```

### 4. Run the backend

```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Create and run the React frontend

Open a second terminal:

```powershell
cd truthlens\frontend
npm install
npm run dev
```

### 6. Open in browser

```text
Frontend: http://localhost:5173
Backend docs: http://localhost:8000/docs
```

## Notes

- SQLite is used automatically with no extra setup.
- The backend creates tables on startup.
- The frontend is configured to use the Vite `/api` proxy by default during development.
