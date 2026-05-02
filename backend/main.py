"""FastAPI application entrypoint for the TruthLens backend."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from api.routes import router
from database import Base, SessionLocal, engine
from models import GlobalStats


# Load environment variables before app startup.
load_dotenv()


def create_app() -> FastAPI:
    """Create and configure the FastAPI app, database tables, and middleware."""
    app = FastAPI(
        title="TruthLens API",
        description="LLM hallucination detector that fact-checks claims sentence by sentence.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def startup():
        Base.metadata.create_all(bind=engine)
        ensure_claim_source_column()
        ensure_analysis_ai_source_column()
        ensure_analysis_hallucination_rate_column()
        db = SessionLocal()
        try:
            stats = db.query(GlobalStats).first()
            if not stats:
                db.add(
                    GlobalStats(
                        id=1,
                        total_analyses=0,
                        total_claims=0,
                    )
                )
                db.commit()
        finally:
            db.close()

    app.include_router(router)
    return app


def ensure_claim_source_column() -> None:
    """Add the claim source column for older SQLite databases if it does not exist yet."""
    inspector = inspect(engine)
    if "claims" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("claims")}
    if "source" in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE claims ADD COLUMN source TEXT NOT NULL DEFAULT ''"))


def ensure_analysis_ai_source_column() -> None:
    """Add the analysis AI source column for older SQLite databases if it is missing."""
    inspector = inspect(engine)
    if "analyses" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("analyses")}
    if "ai_source" in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE analyses ADD COLUMN ai_source TEXT NOT NULL DEFAULT 'Unknown'"))


def ensure_analysis_hallucination_rate_column() -> None:
    """Add the analysis hallucination rate column for older SQLite databases if it is missing."""
    inspector = inspect(engine)
    if "analyses" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("analyses")}
    if "hallucination_rate" in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE analyses ADD COLUMN hallucination_rate FLOAT NOT NULL DEFAULT 0"))
app = create_app()
