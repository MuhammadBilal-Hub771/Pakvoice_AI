"""One-off migration from the JSON file store and ChromaDB into Supabase.

Usage (from the backend directory, with SUPABASE_DB_URL set in .env):

    python -m scripts.migrate_json_to_supabase --dry-run
    python -m scripts.migrate_json_to_supabase

Order matters: users first, then everything that references them. Rows whose
owner is missing are skipped rather than repointed, because guessing an owner
would put one user's documents in another's knowledge base.

Re-running is safe. Every insert is keyed on the original id and existing rows
are left alone.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings  # noqa: E402
from db.models_sql import (  # noqa: E402
    DocumentChunkRow,
    DocumentRow,
    GenerationHistoryRow,
    ImageRow,
    UserRow,
)
from db.session import db_session  # noqa: E402

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


class Stats:
    def __init__(self) -> None:
        self.inserted = 0
        self.skipped_existing = 0
        self.skipped_invalid = 0

    def __str__(self) -> str:
        return (
            f"inserted={self.inserted} "
            f"already_present={self.skipped_existing} "
            f"skipped={self.skipped_invalid}"
        )


def read_json(name: str) -> List[Dict[str, Any]]:
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        print(f"  {name}: not found, nothing to migrate")
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError as e:
        print(f"  {name}: could not be parsed ({e})")
        return []


def valid_uuid(value: Any) -> Optional[str]:
    try:
        return str(UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        return None


def parse_dt(value: Any) -> datetime:
    """Accept both isoformat() and str(datetime) shapes written over time."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        try:
            parsed = datetime.fromisoformat(value.strip())
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def as_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str) and value.strip():
        return [t.strip() for t in value.split(",") if t.strip()]
    return []


def migrate_users(dry_run: bool) -> tuple[Stats, set]:
    print("\nUsers")
    stats = Stats()
    known_ids: set = set()

    for record in read_json("users.json"):
        user_id = valid_uuid(record.get("id"))
        email = (record.get("email") or "").strip()
        if not user_id or not email:
            print(f"  skip: missing id or email ({record.get('email')})")
            stats.skipped_invalid += 1
            continue

        known_ids.add(user_id)

        if dry_run:
            stats.inserted += 1
            continue

        with db_session() as s:
            if s.get(UserRow, user_id):
                stats.skipped_existing += 1
                continue
            s.add(
                UserRow(
                    id=user_id,
                    name=record.get("name") or email.split("@")[0],
                    email=email,
                    hashed_password=record.get("hashed_password") or "",
                    role=record.get("role") or "client",
                    city=record.get("city") or "",
                    industry=record.get("industry"),
                    is_active=bool(record.get("is_active", True)),
                    whatsapp_phone=record.get("whatsapp_phone"),
                    created_at=parse_dt(record.get("created_at")),
                    updated_at=(
                        parse_dt(record["updated_at"])
                        if record.get("updated_at")
                        else None
                    ),
                )
            )
            stats.inserted += 1

    print(f"  {stats}")
    return stats, known_ids


def migrate_history(dry_run: bool, known_users: set) -> Stats:
    print("\nGeneration history")
    stats = Stats()

    for record in read_json("history.json"):
        content_id = valid_uuid(record.get("content_id"))
        user_id = valid_uuid(record.get("user_id"))
        if not content_id or not user_id:
            stats.skipped_invalid += 1
            continue
        if user_id not in known_users:
            print(f"  skip {content_id}: owner {user_id} not migrated")
            stats.skipped_invalid += 1
            continue

        if dry_run:
            stats.inserted += 1
            continue

        with db_session() as s:
            if s.get(GenerationHistoryRow, content_id):
                stats.skipped_existing += 1
                continue
            s.add(
                GenerationHistoryRow(
                    content_id=content_id,
                    user_id=user_id,
                    business_name=record.get("business_name") or "",
                    content_type=record.get("content_type") or "",
                    industry=record.get("industry") or "",
                    city=record.get("city") or "",
                    language=record.get("language") or "english",
                    tone=record.get("tone") or "professional",
                    generated_content=record.get("generated_content") or "",
                    tokens_used=int(record.get("tokens_used") or 0),
                    cost_usd=float(record.get("cost_usd") or 0),
                    generation_time_ms=int(record.get("generation_time_ms") or 0),
                    sources_used=record.get("sources_used") or [],
                    is_saved=bool(record.get("is_saved", False)),
                    is_flagged=bool(record.get("is_flagged", False)),
                    source_channel=record.get("source_channel") or "web",
                    created_at=parse_dt(record.get("created_at")),
                    updated_at=(
                        parse_dt(record["updated_at"])
                        if record.get("updated_at")
                        else None
                    ),
                )
            )
            stats.inserted += 1

    print(f"  {stats}")
    return stats


def migrate_documents(dry_run: bool, known_users: set) -> tuple[Stats, set]:
    print("\nDocuments")
    stats = Stats()
    migrated_doc_ids: set = set()

    for record in read_json("documents.json"):
        doc_id = valid_uuid(record.get("doc_id"))
        owner = valid_uuid(record.get("uploaded_by"))
        if not doc_id or not owner:
            stats.skipped_invalid += 1
            continue
        if owner not in known_users:
            print(f"  skip {doc_id}: owner {owner} not migrated")
            stats.skipped_invalid += 1
            continue

        migrated_doc_ids.add(doc_id)

        if dry_run:
            stats.inserted += 1
            continue

        with db_session() as s:
            if s.get(DocumentRow, doc_id):
                stats.skipped_existing += 1
                continue
            s.add(
                DocumentRow(
                    doc_id=doc_id,
                    uploaded_by=owner,
                    title=record.get("title") or "",
                    category=record.get("category") or "general",
                    tags=as_list(record.get("tags")),
                    filename=record.get("filename") or "",
                    storage_path=record.get("storage_path"),
                    # Local files stay on disk; only the metadata moves. Point
                    # at the old path so deletion still cleans them up.
                    file_path=record.get("file_path"),
                    file_size_bytes=int(record.get("file_size_bytes") or 0),
                    word_count=int(record.get("word_count") or 0),
                    chunks_created=int(record.get("chunks_created") or 0),
                    status=record.get("status") or "processed",
                    created_at=parse_dt(record.get("created_at")),
                )
            )
            stats.inserted += 1

    print(f"  {stats}")
    return stats, migrated_doc_ids


def migrate_images(dry_run: bool, known_users: set) -> Stats:
    print("\nImages")
    stats = Stats()

    for record in read_json("images.json"):
        image_id = valid_uuid(record.get("id"))
        owner = valid_uuid(record.get("user_id"))
        if not image_id or not owner:
            stats.skipped_invalid += 1
            continue
        if owner not in known_users:
            stats.skipped_invalid += 1
            continue

        if dry_run:
            stats.inserted += 1
            continue

        with db_session() as s:
            if s.get(ImageRow, image_id):
                stats.skipped_existing += 1
                continue
            s.add(
                ImageRow(
                    id=image_id,
                    user_id=owner,
                    image_url=record.get("image_url") or "",
                    image_type=record.get("image_type") or "social_media",
                    source_content=record.get("source_content") or "",
                    storage_path=record.get("storage_path"),
                    created_at=parse_dt(record.get("created_at")),
                )
            )
            stats.inserted += 1

    print(f"  {stats}")
    return stats


def migrate_chunks(dry_run: bool, known_users: set, known_docs: set) -> Stats:
    """Copy ChromaDB chunk embeddings into document_chunks.

    Embeddings are reused as-is rather than recomputed, so this costs nothing in
    OpenAI credit. It only works if the embedding model is unchanged; a
    different model would need re-uploading the source documents.
    """
    print("\nVector chunks (ChromaDB to pgvector)")
    stats = Stats()

    try:
        from db.chroma import get_or_create_collection
    except ImportError as e:
        print(f"  chromadb unavailable ({e}); skipping")
        return stats

    try:
        collection = get_or_create_collection()
        total = collection.count()
    except Exception as e:
        print(f"  could not open ChromaDB collection ({e}); skipping")
        return stats

    if total == 0:
        print("  collection is empty, nothing to migrate")
        return stats

    print(f"  found {total} chunks")

    batch_size = 500
    offset = 0
    while offset < total:
        try:
            batch = collection.get(
                limit=batch_size,
                offset=offset,
                include=["documents", "metadatas", "embeddings"],
            )
        except Exception as e:
            print(f"  failed reading chunks at offset {offset}: {e}")
            break

        ids = batch.get("ids") or []
        documents = batch.get("documents") or []
        metadatas = batch.get("metadatas") or []
        embeddings = batch.get("embeddings") or []

        for i, chunk_id in enumerate(ids):
            metadata = metadatas[i] if i < len(metadatas) else {}
            doc_id = valid_uuid(metadata.get("doc_id"))
            owner = valid_uuid(metadata.get("uploaded_by"))
            embedding = embeddings[i] if i < len(embeddings) else None
            content = documents[i] if i < len(documents) else ""

            if not doc_id or not owner or embedding is None or not content:
                stats.skipped_invalid += 1
                continue
            if owner not in known_users or doc_id not in known_docs:
                stats.skipped_invalid += 1
                continue
            if len(embedding) != settings.EMBEDDING_DIMENSIONS:
                print(
                    f"  skip {chunk_id}: embedding has {len(embedding)} dims, "
                    f"table expects {settings.EMBEDDING_DIMENSIONS}"
                )
                stats.skipped_invalid += 1
                continue

            chunk_index = int(metadata.get("chunk_index") or 0)

            if dry_run:
                stats.inserted += 1
                continue

            with db_session() as s:
                existing = (
                    s.query(DocumentChunkRow)
                    .filter(
                        DocumentChunkRow.doc_id == doc_id,
                        DocumentChunkRow.chunk_index == chunk_index,
                    )
                    .first()
                )
                if existing:
                    stats.skipped_existing += 1
                    continue
                s.add(
                    DocumentChunkRow(
                        doc_id=doc_id,
                        user_id=owner,
                        chunk_index=chunk_index,
                        content=content,
                        title=metadata.get("title") or "",
                        category=metadata.get("category") or "general",
                        embedding=list(embedding),
                    )
                )
                stats.inserted += 1

        offset += batch_size

    print(f"  {stats}")
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Migrate JSON store and ChromaDB data into Supabase Postgres"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report what would be migrated without writing anything",
    )
    parser.add_argument(
        "--skip-chunks",
        action="store_true",
        help="skip ChromaDB embeddings (re-upload documents instead)",
    )
    args = parser.parse_args()

    if not settings.use_postgres:
        print(
            "SUPABASE_DB_URL is not set. Add it to backend/.env before running "
            "this migration."
        )
        return 1

    if args.dry_run:
        print("DRY RUN — no data will be written")
    else:
        from db.session import check_connection

        if not check_connection():
            print(
                "Cannot reach Postgres. Check SUPABASE_DB_URL and that "
                "db/schema.sql has been applied."
            )
            return 1

    print(f"Reading JSON data from {DATA_DIR}")

    _, known_users = migrate_users(args.dry_run)
    migrate_history(args.dry_run, known_users)
    _, known_docs = migrate_documents(args.dry_run, known_users)
    migrate_images(args.dry_run, known_users)

    if args.skip_chunks:
        print("\nVector chunks: skipped (--skip-chunks)")
    else:
        migrate_chunks(args.dry_run, known_users, known_docs)

    print("\nDone.")
    if args.dry_run:
        print("Re-run without --dry-run to apply.")
    else:
        print(
            "The JSON files under backend/data/ are left untouched. Keep them "
            "as a backup until you have verified the app against Postgres."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
