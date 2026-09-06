"""initial schema

Applies db/schema.sql rather than re-declaring every table in Alembic ops, so
the two can never drift apart. schema.sql is idempotent, which also makes this
revision safe to run against a database that was set up via the Supabase SQL
editor (though `alembic stamp 0001_initial` is the cleaner route there).

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-25

"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = [
    "whatsapp_processed_messages",
    "whatsapp_link_codes",
    "whatsapp_sessions",
    "images",
    "document_chunks",
    "documents",
    "generation_history",
    "users",
]


def upgrade() -> None:
    schema_sql = Path(__file__).resolve().parents[2] / "db" / "schema.sql"
    op.execute(schema_sql.read_text(encoding="utf-8"))


def downgrade() -> None:
    for table in _TABLES:
        op.execute(f"drop table if exists {table} cascade")
