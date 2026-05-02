"""ORM models for stored analyses and per-claim fact-check results."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Analysis(Base):
    """Store the high-level result for one submitted text analysis."""

    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    input_text = Column(Text, nullable=False)
    ai_source = Column(String, nullable=False, default="Unknown")
    overall_score = Column(Integer, nullable=False, default=0)
    true_count = Column(Integer, nullable=False, default=0)
    false_count = Column(Integer, nullable=False, default=0)
    uncertain_count = Column(Integer, nullable=False, default=0)
    hallucination_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    claims = relationship(
        "Claim",
        back_populates="analysis",
        cascade="all, delete-orphan",
        order_by="Claim.id",
    )


class Claim(Base):
    """Store the fact-check outcome for an individual extracted claim."""

    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False, index=True)
    claim_text = Column(Text, nullable=False)
    verdict = Column(String(32), nullable=False)
    confidence = Column(Integer, nullable=False, default=0)
    correct_info = Column(Text, nullable=False, default="")
    source = Column(Text, nullable=False, default="")
    source_url = Column(Text, nullable=False, default="")
    explanation = Column(Text, nullable=False, default="")

    analysis = relationship("Analysis", back_populates="claims")


class GlobalStats(Base):
    """Store cumulative global usage counters for the TruthLens product."""

    __tablename__ = "global_stats"

    id = Column(Integer, primary_key=True)
    total_analyses = Column(Integer, default=0)
    total_claims = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)


class HallucinationStats(Base):
    """Track cumulative hallucination rates per AI model/source over time."""

    __tablename__ = "hallucination_stats"

    id = Column(Integer, primary_key=True)
    ai_source = Column(String, nullable=False)
    total_claims = Column(Integer, default=0)
    hallucinated_claims = Column(Integer, default=0)
    hallucination_rate = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow)
