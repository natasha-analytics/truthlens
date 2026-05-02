"""API routes for health checks, hallucination analysis, history, and leaderboard stats."""

import json
import os
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from analyzer.claim_extractor import detect_input_type, extract_claims
from analyzer.fact_checker import answer_question, fact_check_all_claims
from analyzer.scorer import calculate_score
from database import SessionLocal, get_db
from models import Analysis, Claim, GlobalStats, HallucinationStats


router = APIRouter(prefix="/api", tags=["truthlens"])


class AnalyzeRequest(BaseModel):
    """Validate incoming text analysis requests."""

    text: str = Field(..., min_length=1, description="AI-generated text to fact-check")
    ai_source: Optional[str] = "Unknown AI"


def load_accuracy_rate() -> float:
    """Load the saved benchmark accuracy rate from disk if available."""
    try:
        path = os.path.join(os.path.dirname(__file__), "..", "accuracy_results.json")
        with open(path) as results_file:
            data = json.load(results_file)
            return float(data.get("accuracy", 0))
    except Exception:
        return 0.0


def serialize_claim(claim: Claim) -> dict:
    """Convert a stored claim ORM object into an API-friendly dictionary."""
    verification_source = "wikipedia_and_claude" if "wikipedia.org/wiki/" in (claim.source_url or "") else "claude_only"
    return {
        "id": claim.id,
        "claim": claim.claim_text,
        "verdict": claim.verdict,
        "confidence": claim.confidence,
        "correct_info": claim.correct_info,
        "source": claim.source,
        "source_url": claim.source_url,
        "explanation": claim.explanation,
        "is_hallucination": claim.verdict == "FALSE",
        "verification_source": verification_source,
    }


def serialize_analysis(analysis: Analysis) -> dict:
    """Convert a stored analysis ORM object, including claims, into API response JSON."""
    claims = [serialize_claim(claim) for claim in analysis.claims]
    problematic_claims = [
        claim["claim"] for claim in claims if claim["verdict"] in {"FALSE", "UNCERTAIN", "UNVERIFIABLE"}
    ]
    hallucinated_count = sum(1 for claim in claims if claim["verdict"] == "FALSE")
    unverifiable_count = sum(1 for claim in claims if claim["verdict"] == "UNVERIFIABLE")

    if analysis.hallucination_rate == 0:
        risk_level = "NO HALLUCINATIONS"
        risk_color = "green"
    elif analysis.hallucination_rate <= 25:
        risk_level = "LOW RISK"
        risk_color = "green"
    elif analysis.hallucination_rate <= 50:
        risk_level = "MEDIUM RISK"
        risk_color = "yellow"
    else:
        risk_level = "HIGH RISK"
        risk_color = "red"

    return {
        "id": analysis.id,
        "input_text": analysis.input_text,
        "ai_source": analysis.ai_source,
        "overall_score": analysis.overall_score,
        "true_count": analysis.true_count,
        "false_count": analysis.false_count,
        "uncertain_count": analysis.uncertain_count,
        "unverifiable_count": unverifiable_count,
        "hallucination_rate": analysis.hallucination_rate,
        "hallucinated_count": hallucinated_count,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "total_claims": len(claims),
        "problematic_claims": problematic_claims,
        "claims": claims,
        "message": None,
        "input_type": "CLAIMS",
    }


@router.get("/health")
def health_check() -> dict:
    """Return a simple health response so the frontend can verify backend availability."""
    return {"status": "TruthLens running"}


@router.post("/analyze")
async def analyze_text(request: AnalyzeRequest, db: Session = Depends(get_db)) -> dict:
    """Analyze pasted AI output, detect hallucinations, persist the report, and update aggregate stats."""
    try:
        text = request.text.strip()
        ai_source = getattr(request, "ai_source", "Unknown AI") or "Unknown AI"

        if not text or len(text) < 3:
            return {
                "input_type": "EMPTY",
                "ai_source": ai_source,
                "message": "Please paste some text.",
                "overall_score": 0,
                "hallucination_rate": 0,
                "total_claims": 0,
                "hallucinated_count": 0,
                "true_count": 0,
                "false_count": 0,
                "uncertain_count": 0,
                "claims": [],
                "risk_level": "UNKNOWN",
                "risk_color": "gray",
            }

        input_type = await detect_input_type(text)
        print(f"Input type: {input_type}")

        non_claim = {
            "GREETING": "Hello! Paste any AI response to detect hallucinations.",
            "GIBBERISH": "No verifiable claims found. Paste an AI response.",
            "CODE": "TruthLens detects hallucinations in AI text, not code. Paste the explanation instead.",
            "COMMAND": "Paste any ChatGPT or Gemini response to analyze.",
        }

        if input_type in non_claim:
            return {
                "input_type": input_type,
                "ai_source": ai_source,
                "message": non_claim[input_type],
                "overall_score": 0,
                "hallucination_rate": 0,
                "total_claims": 0,
                "hallucinated_count": 0,
                "true_count": 0,
                "false_count": 0,
                "uncertain_count": 0,
                "claims": [],
                "risk_level": "UNKNOWN",
                "risk_color": "gray",
            }

        if input_type == "QUESTION":
            answer = await answer_question(text)
            return {
                "input_type": "QUESTION",
                "ai_source": ai_source,
                "message": answer,
                "overall_score": 0,
                "hallucination_rate": 0,
                "total_claims": 0,
                "hallucinated_count": 0,
                "true_count": 0,
                "false_count": 0,
                "uncertain_count": 0,
                "claims": [],
                "risk_level": "UNKNOWN",
                "risk_color": "gray",
            }

        claims = await extract_claims(text)
        claims = [claim.strip() for claim in claims if claim and claim.strip()]
        print(f"Extracted claims: {claims}")

        if not claims:
            return {
                "input_type": input_type,
                "ai_source": ai_source,
                "message": "No verifiable claims found.",
                "overall_score": 0,
                "hallucination_rate": 0,
                "total_claims": 0,
                "hallucinated_count": 0,
                "true_count": 0,
                "false_count": 0,
                "uncertain_count": 0,
                "claims": [],
                "risk_level": "UNKNOWN",
                "risk_color": "gray",
            }

        results = await fact_check_all_claims(claims)
        print(f"Results: {results}")

        score_data = calculate_score(results)

        total_checkable = [
            result for result in results
            if result.get("verdict") in ["TRUE", "FALSE", "UNCERTAIN"]
        ]
        hallucinated = [
            result for result in results
            if result.get("verdict") == "FALSE"
        ]

        hallucination_rate = 0.0
        if total_checkable:
            hallucination_rate = round(len(hallucinated) / len(total_checkable) * 100, 1)

        if hallucination_rate == 0:
            risk_level = "NO HALLUCINATIONS"
            risk_color = "green"
        elif hallucination_rate <= 20:
            risk_level = "LOW RISK"
            risk_color = "green"
        elif hallucination_rate <= 50:
            risk_level = "MEDIUM RISK"
            risk_color = "yellow"
        else:
            risk_level = "HIGH RISK"
            risk_color = "red"

        claims_output = []
        for index, claim in enumerate(claims):
            result = results[index] if index < len(results) else {}
            claims_output.append(
                {
                    "claim": claim,
                    "verdict": result.get("verdict", "UNCERTAIN"),
                    "confidence": result.get("confidence", 70),
                    "correct_info": result.get("correct_info", ""),
                    "explanation": result.get("explanation", ""),
                    "source": result.get("source", ""),
                    "source_url": result.get("source_url", ""),
                    "is_hallucination": result.get("is_hallucination", False),
                    "verification_source": result.get("verification_source", "claude_only"),
                }
            )

        try:
            analysis = Analysis(
                input_text=text[:1000],
                ai_source=ai_source,
                overall_score=score_data["overall_score"],
                true_count=score_data["true_count"],
                false_count=score_data["false_count"],
                uncertain_count=score_data["uncertain_count"],
                hallucination_rate=hallucination_rate,
            )
            db.add(analysis)
            db.flush()

            for result in claims_output:
                db.add(
                    Claim(
                        analysis_id=analysis.id,
                        claim_text=result["claim"],
                        verdict=result["verdict"],
                        confidence=result["confidence"],
                        correct_info=result["correct_info"],
                        source=result["source"],
                        source_url=result["source_url"],
                        explanation=result["explanation"],
                    )
                )

            ai_stats = db.query(HallucinationStats).filter_by(ai_source=ai_source).first()
            if ai_stats:
                ai_stats.total_claims += len(total_checkable)
                ai_stats.hallucinated_claims += len(hallucinated)
                if ai_stats.total_claims > 0:
                    ai_stats.hallucination_rate = round(
                        ai_stats.hallucinated_claims / ai_stats.total_claims * 100,
                        1,
                    )
                ai_stats.last_updated = datetime.utcnow()
            else:
                db.add(
                    HallucinationStats(
                        ai_source=ai_source,
                        total_claims=len(total_checkable),
                        hallucinated_claims=len(hallucinated),
                        hallucination_rate=hallucination_rate,
                        last_updated=datetime.utcnow(),
                    )
                )

            db.commit()
        except Exception as db_error:
            print(f"DB error (non-fatal): {db_error}")
            db.rollback()

        try:
            stats = db.query(GlobalStats).first()
            if stats:
                stats.total_analyses += 1
                stats.total_claims += len(claims)
                stats.last_updated = datetime.utcnow()
                db.commit()
        except Exception as stats_error:
            print(f"Stats error (non-fatal): {stats_error}")
            db.rollback()

        return {
            "input_type": input_type,
            "ai_source": ai_source,
            "overall_score": score_data["overall_score"],
            "true_count": score_data["true_count"],
            "false_count": score_data["false_count"],
            "uncertain_count": score_data["uncertain_count"],
            "hallucination_rate": hallucination_rate,
            "risk_level": risk_level,
            "risk_color": risk_color,
            "total_claims": len(claims),
            "hallucinated_count": len(hallucinated),
            "claims": claims_output,
            "message": None,
        }
    except Exception as exc:
        print(f"CRITICAL ERROR in analyze: {exc}")
        traceback.print_exc()
        return {
            "input_type": "ERROR",
            "ai_source": "Unknown",
            "message": f"Analysis failed: {str(exc)}",
            "overall_score": 0,
            "hallucination_rate": 0,
            "total_claims": 0,
            "hallucinated_count": 0,
            "true_count": 0,
            "false_count": 0,
            "uncertain_count": 0,
            "claims": [],
            "risk_level": "UNKNOWN",
            "risk_color": "gray",
        }


@router.get("/history")
def get_history(db: Session = Depends(get_db)) -> dict:
    """Return the 10 most recent saved analyses with their stored claims."""
    analyses = (
        db.query(Analysis)
        .options(joinedload(Analysis.claims))
        .order_by(Analysis.created_at.desc())
        .limit(10)
        .all()
    )
    return {"items": [serialize_analysis(analysis) for analysis in analyses]}


@router.get("/accuracy")
def get_accuracy() -> dict:
    """Return the saved backend accuracy benchmark results if they exist."""
    results_path = Path(__file__).resolve().parents[1] / "accuracy_results.json"
    if not results_path.exists():
        return {"tested": False, "message": "Run accuracy test first"}

    with results_path.open() as results_file:
        return json.load(results_file)


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)) -> dict:
    """Return landing-page stats including total usage, model coverage, and average hallucination rate."""
    try:
        stats = db.query(GlobalStats).first()
        total_analyses = stats.total_analyses if stats else 0
        total_claims = stats.total_claims if stats else 0
        ai_rows = db.query(HallucinationStats).all()
        average_hallucination_rate = round(
            sum(row.hallucination_rate for row in ai_rows) / len(ai_rows),
            1,
        ) if ai_rows else 0.0

        return {
            "total_analyses": total_analyses,
            "total_claims": total_claims,
            "accuracy_rate": load_accuracy_rate(),
            "ai_models_tested": len(ai_rows),
            "average_hallucination_rate": average_hallucination_rate,
        }
    except Exception as exc:
        return {
            "total_analyses": 0,
            "total_claims": 0,
            "accuracy_rate": 0,
            "ai_models_tested": 0,
            "average_hallucination_rate": 0,
            "error": str(exc),
        }


@router.get("/hallucination-stats")
def get_hallucination_stats(db: Session = Depends(get_db)) -> dict:
    """Return cumulative hallucination performance by AI source for the leaderboard."""
    stats = db.query(HallucinationStats).all()
    return {
        "stats": [
            {
                "ai_source": stat.ai_source,
                "total_claims": stat.total_claims,
                "hallucinated": stat.hallucinated_claims,
                "rate": stat.hallucination_rate,
            }
            for stat in stats
        ]
    }
