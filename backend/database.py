"""Database configuration and session helpers for TruthLens."""

import os
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# Load environment variables before reading database settings.
load_dotenv()


# Resolve the database URL, defaulting to a local SQLite file.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./truthlens.db")


# Configure SQLite-specific connection arguments when needed.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}


# Create the SQLAlchemy engine used across the backend.
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)


# Create a session factory for request-scoped database sessions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


# Define the declarative base class for ORM models.
Base = declarative_base()


def get_db():
    """Yield a database session and always close it after the request finishes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_stats(db):
    """Ensure the single global stats row exists before the app handles requests."""
    from models import GlobalStats

    stats = db.query(GlobalStats).first()
    if not stats:
        db.add(
            GlobalStats(
                id=1,
                total_analyses=0,
                total_claims=0,
                last_updated=datetime.utcnow(),
            )
        )
        db.commit()
