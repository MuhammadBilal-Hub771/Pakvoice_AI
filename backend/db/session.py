"""SQLAlchemy engine and session management for the Supabase Postgres backend.

The engine is created lazily so the app still boots when SUPABASE_DB_URL is
unset (in that case the JSON file store is used instead).

These sessions are synchronous on purpose. The store functions in
``db/sql_store.py`` keep the exact signatures of the original JSON store
functions, which are called directly (not awaited) from ~40 places across
``api/`` and ``services/``. Going async would mean touching every one of them.
Postgres queries here are single-digit milliseconds, which is still far less
blocking than the full-file reads and writes they replace.
"""

from contextlib import contextmanager
from typing import Iterator, Optional

from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from config import settings

_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None


def _normalize_db_url(url: str) -> str:
    """Force the psycopg (v3) driver regardless of how the URL was pasted.

    Supabase hands out URLs starting with ``postgresql://`` or ``postgres://``,
    both of which SQLAlchemy would resolve to psycopg2.
    """
    url = url.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        if not settings.use_postgres:
            raise RuntimeError(
                "SUPABASE_DB_URL is not configured; Postgres is unavailable"
            )
        url = _normalize_db_url(settings.SUPABASE_DB_URL)
        _engine = create_engine(
            url,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            # Supabase's pooler drops idle connections; recycling avoids
            # handing out a dead one from the pool.
            pool_recycle=settings.DB_POOL_RECYCLE_SECONDS,
            pool_pre_ping=True,
            future=True,
        )
        logger.info("Postgres engine initialized")
    return _engine


def get_session_factory() -> sessionmaker:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            expire_on_commit=False,
            future=True,
        )
    return _SessionLocal


@contextmanager
def db_session() -> Iterator[Session]:
    """Transactional scope. Commits on success, rolls back on any exception."""
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def check_connection() -> bool:
    """Used by the health endpoint and app startup."""
    from sqlalchemy import text

    try:
        with get_engine().connect() as conn:
            conn.execute(text("select 1"))
        return True
    except Exception as e:
        logger.error(f"Postgres connection check failed: {e}")
        return False


def dispose_engine() -> None:
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
        _engine = None
        _SessionLocal = None
