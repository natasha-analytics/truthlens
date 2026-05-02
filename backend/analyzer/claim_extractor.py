import re
import json
import os

import httpx
from dotenv import load_dotenv


load_dotenv()


def clean_ai_text(text: str) -> str:
    """Remove emojis, markdown, bullets from AI output."""
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\*\*?(.*?)\*\*?", r"\1", text)
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"`{1,3}.*?`{1,3}", "", text, flags=re.DOTALL)
    text = re.sub(r"^\s*[-•*→►▶✓✗×]\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+[.)]\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"[→←↑↓►◄▲▼★☆✓✗]", "", text)
    lines = [line.strip() for line in text.split("\n") if line.strip() and len(line.strip()) > 10]
    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text).strip()
    return text


async def call_claude(prompt: str) -> str:
    """Call Claude API and return text."""
    headers = {"Content-Type": "application/json"}
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60.0,
        )
        response.raise_for_status()
        data = response.json()
        if "content" in data and len(data["content"]) > 0:
            return data["content"][0]["text"]
        return ""


def heuristic_detect_input_type(text: str) -> str:
    """Fallback input classifier used when Claude is unavailable."""
    stripped_text = text.strip()
    normalized = stripped_text.lower()
    code_indicators = [
        "def ", "function(", "import ", "class ", "for i in", "while(", "print(", "console.log",
        "#!/", "var ", "const ", "let ", "=>", "==", "!=", "{}", "[]",
    ]
    has_code = any(indicator in normalized for indicator in code_indicators)
    sentences = re.split(r"[.!?]+", stripped_text)
    long_sentences = [sentence for sentence in sentences if len(sentence.split()) > 8]

    if not stripped_text or len(stripped_text) < 5:
        return "EMPTY"
    if normalized in {"hello", "hi", "hey", "hello!", "hi!", "hey!", "how are you", "good morning", "good evening"}:
        return "GREETING"
    if len(long_sentences) >= 2 and not has_code:
        return "CLAIMS"
    if has_code:
        return "CODE"
    if stripped_text.endswith("?") or normalized.startswith(("what ", "who ", "when ", "where ", "why ", "how ", "is ", "are ", "can ", "could ", "should ", "do ", "does ")):
        return "QUESTION"
    if re.fullmatch(r"[a-z\s]+", normalized) and len(set(re.findall(r"[a-z]", normalized))) > 10 and "?" not in normalized and "." not in normalized:
        words = normalized.split()
        if words and all(len(word) > 4 for word in words):
            return "GIBBERISH"
    if any(phrase in normalized for phrase in ["i think", "i feel", "in my opinion", "the best", "the worst", "beautiful", "amazing", "terrible"]):
        return "OPINION"
    return "CLAIMS"


async def detect_input_type(text: str) -> str:
    """Detect whether the pasted text is claims, code, questions, gibberish, or another input type."""
    truncated_text = text[:300]
    sentences = text.split(".")
    long_sentences = [sentence for sentence in sentences if len(sentence.split()) > 8]
    code_indicators = [
        "def ", "function(", "import ", "class ", "for i in", "while(", "print(", "console.log",
        "#!/", "var ", "const ", "let ", "=>", "==", "!=", "{}", "[]",
    ]
    has_code = any(indicator in text.lower() for indicator in code_indicators)

    if len(long_sentences) >= 2 and not has_code:
        return "CLAIMS"

    prompt = f"""Classify this text into ONE category.
Return ONE word only.

Text: "{truncated_text}"

STRICT RULES:
- Only return CODE if text contains actual
  programming syntax like:
  def, function, for loop, if else,
  import, class, var, const, print(),
  actual code brackets and syntax
- Normal English sentences about technology
  are NOT code — they are CLAIMS
- Biography text is CLAIMS not CODE
- Historical facts are CLAIMS not CODE
- If text has normal English sentences
  with facts → return CLAIMS

Categories:
CLAIMS - English sentences with facts
QUESTION - asking something with ?
CODE - actual programming code syntax only
GIBBERISH - random meaningless characters
GREETING - hello hi hey
OPINION - personal feelings only
EMPTY - blank or less than 5 chars

Text to classify: "{truncated_text}"
One word:"""

    try:
        result = await call_claude(prompt)
        category = result.strip().upper()
        valid = ["CLAIMS", "QUESTION", "CODE", "GIBBERISH", "GREETING", "OPINION", "EMPTY"]
        return category if category in valid else "CLAIMS"
    except Exception:
        return heuristic_detect_input_type(text)


async def extract_claims(text: str) -> list[str]:
    """Extract clean individual factual claims from text."""
    text = clean_ai_text(text)

    prompt = f"""Extract individual factual claims from this text.
Return ONLY a valid JSON array of strings.
No markdown. No backticks. Raw JSON only.

Rules:
- Each claim must be ONE short clear sentence
- Maximum 15 words per claim
- Split long sentences into shorter claims
- Remove all emojis and special characters
- Only extract checkable facts
- Ignore opinions and vague statements
- Maximum 8 claims total

Text: {text}

Example output:
["ARPANET was created in 1969",
 "Tim Berners-Lee invented the World Wide Web",
 "The first website went live in 1991"]

Output JSON array only:"""

    try:
        response = await call_claude(prompt)
        clean = response.strip()

        if "```" in clean:
            parts = clean.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("["):
                    clean = part
                    break

        claims = json.loads(clean)
        if isinstance(claims, list):
            claims = [
                claim.strip().strip('"').strip("'").strip()
                for claim in claims
                if isinstance(claim, str) and len(claim.strip()) > 5
            ]
            return claims[:8]
    except Exception as exc:
        print(f"Claim extraction error: {exc}")

    sentences = re.split(r"[.!?]+", text)
    return [sentence.strip() for sentence in sentences if len(sentence.strip()) > 10][:8]
