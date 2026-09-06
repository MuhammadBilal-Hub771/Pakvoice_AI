"""SQLAlchemy ORM models mirroring db/schema.sql.

Kept in a separate module from the Pydantic models in ``models/`` so the two
layers stay independent: Pydantic describes the API contract, these describe
the tables.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from config import settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False, default="")
    role: Mapped[str] = mapped_column(Text, nullable=False, default="client")
    city: Mapped[str] = mapped_column(Text, nullable=False, default="")
    industry: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    whatsapp_phone: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class GenerationHistoryRow(Base):
    __tablename__ = "generation_history"

    content_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    business_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_type: Mapped[str] = mapped_column(Text, nullable=False, default="")
    industry: Mapped[str] = mapped_column(Text, nullable=False, default="")
    city: Mapped[str] = mapped_column(Text, nullable=False, default="")
    language: Mapped[str] = mapped_column(Text, nullable=False, default="english")
    tone: Mapped[str] = mapped_column(Text, nullable=False, default="professional")
    generated_content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    generation_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sources_used: Mapped[Any] = mapped_column(JSONB, nullable=False, default=list)
    is_saved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_channel: Mapped[str] = mapped_column(Text, nullable=False, default="web")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class DocumentRow(Base):
    __tablename__ = "documents"

    doc_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    uploaded_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(Text, nullable=False, default="general")
    tags: Mapped[Any] = mapped_column(JSONB, nullable=False, default=list)
    filename: Mapped[str] = mapped_column(Text, nullable=False, default="")
    storage_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunks_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="processed")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class DocumentChunkRow(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (UniqueConstraint("doc_id", "chunk_index"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    doc_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("documents.doc_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(Text, nullable=False, default="general")
    embedding: Mapped[Any] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSIONS), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class ImageRow(Base):
    __tablename__ = "images"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    image_type: Mapped[str] = mapped_column(Text, nullable=False, default="social_media")
    source_content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    storage_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class AgentRunRow(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    goal: Mapped[str] = mapped_column(Text, nullable=False, default="")
    steps: Mapped[Any] = mapped_column(JSONB, nullable=False, default=list)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class WhatsAppSessionRow(Base):
    __tablename__ = "whatsapp_sessions"

    phone: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    state: Mapped[str] = mapped_column(Text, nullable=False, default="new")
    context: Mapped[Any] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class WhatsAppLinkCodeRow(Base):
    __tablename__ = "whatsapp_link_codes"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )


class WhatsAppProcessedMessageRow(Base):
    __tablename__ = "whatsapp_processed_messages"

    message_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
