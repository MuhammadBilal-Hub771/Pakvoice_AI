"""Postgres (Supabase) implementation of the persistence layer.

Every public function here mirrors the signature of its counterpart in
``db/legacy_json_store.py``, so ``db/json_store.py`` can swap between the two
without any caller in ``api/`` or ``services/`` changing.

Datetime shapes deliberately match the old JSON store: documents and images
return ISO strings (callers do string parsing on them), while users and history
return real datetime objects (their Pydantic models declare ``datetime``).
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID as _UUID, uuid4

from loguru import logger
from sqlalchemy import delete, func, insert, select, update

from config import settings
from core.security import hash_password, verify_password
from db.models_sql import (
    AgentRunRow,
    DocumentRow,
    GenerationHistoryRow,
    ImageRow,
    UserRow,
    WhatsAppLinkCodeRow,
    WhatsAppProcessedMessageRow,
    WhatsAppSessionRow,
)
from db.session import db_session
from models.history import GenerationHistoryItem
from models.user import UserCreate, UserInDB, UserRole


# === Helpers ===


def _is_uuid(value: Any) -> bool:
    try:
        _UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _user_to_model(row: UserRow) -> UserInDB:
    return UserInDB(
        id=str(row.id),
        name=row.name,
        email=row.email,
        hashed_password=row.hashed_password or "",
        role=UserRole(row.role),
        city=row.city or "",
        industry=row.industry,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _history_to_model(row: GenerationHistoryRow) -> GenerationHistoryItem:
    return GenerationHistoryItem(
        content_id=str(row.content_id),
        user_id=str(row.user_id),
        business_name=row.business_name,
        content_type=row.content_type,
        industry=row.industry,
        city=row.city,
        language=row.language,
        tone=row.tone,
        generated_content=row.generated_content,
        tokens_used=row.tokens_used,
        cost_usd=row.cost_usd,
        generation_time_ms=row.generation_time_ms,
        sources_used=row.sources_used or [],
        is_saved=row.is_saved,
        is_flagged=row.is_flagged,
        source_channel=row.source_channel,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _document_to_dict(row: DocumentRow) -> Dict[str, Any]:
    return {
        "doc_id": str(row.doc_id),
        "title": row.title,
        "category": row.category,
        "tags": row.tags or [],
        "filename": row.filename,
        "storage_path": row.storage_path,
        "file_path": row.file_path,
        "file_size_bytes": row.file_size_bytes,
        "word_count": row.word_count,
        "chunks_created": row.chunks_created,
        "status": row.status,
        "uploaded_by": str(row.uploaded_by),
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _image_to_dict(row: ImageRow) -> Dict[str, Any]:
    return {
        "id": str(row.id),
        "user_id": str(row.user_id),
        "image_url": row.image_url,
        "image_type": row.image_type,
        "source_content": row.source_content,
        "storage_path": row.storage_path,
        "created_at": _iso(row.created_at),
    }


def _seed_users():
    """Create demo accounts on an empty database (DEBUG only)."""
    with db_session() as s:
        if s.scalar(select(func.count()).select_from(UserRow)):
            return
        if not settings.DEBUG:
            logger.warning(
                "User table is empty and DEBUG is off — skipping demo user seeding. "
                "Register the first account via POST /api/auth/register."
            )
            return
        now = datetime.now(timezone.utc)
        s.add_all(
            [
                UserRow(
                    id=str(uuid4()),
                    name="Admin User",
                    email="admin@contentpk.ai",
                    hashed_password=hash_password("Admin@123"),
                    role=UserRole.ADMIN.value,
                    city="Islamabad",
                    is_active=True,
                    created_at=now,
                ),
                UserRow(
                    id=str(uuid4()),
                    name="Client User",
                    email="client@contentpk.ai",
                    hashed_password=hash_password("Client@123"),
                    role=UserRole.CLIENT.value,
                    city="Karachi",
                    is_active=True,
                    created_at=now,
                ),
            ]
        )
    logger.info("Seeded default dev users")


# === User Operations ===


def get_user_by_email(email: str) -> Optional[UserInDB]:
    with db_session() as s:
        row = s.scalar(select(UserRow).where(UserRow.email == email))
        return _user_to_model(row) if row else None


def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    if not _is_uuid(user_id):
        return None
    with db_session() as s:
        row = s.get(UserRow, str(user_id))
        return _user_to_model(row) if row else None


def create_user(user_data: UserCreate, role: UserRole = UserRole.CLIENT) -> UserInDB:
    with db_session() as s:
        row = UserRow(
            id=str(uuid4()),
            name=user_data.name,
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            role=role.value,
            city=user_data.city,
            industry=user_data.industry,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        s.add(row)
        s.flush()
        return _user_to_model(row)


def create_oauth_user(email: str, name: str, city: str = "") -> UserInDB:
    """Create a passwordless user for a federated (Google) login."""
    with db_session() as s:
        row = UserRow(
            id=str(uuid4()),
            name=name,
            email=email,
            hashed_password="",
            role=UserRole.CLIENT.value,
            city=city,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        s.add(row)
        s.flush()
        return _user_to_model(row)


def authenticate_user(email: str, password: str, role: str) -> Optional[UserInDB]:
    user = get_user_by_email(email)
    if not user:
        return None
    if user.role.value != role:
        return None
    # OAuth-only accounts have no usable password hash.
    if not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


def list_users() -> List[UserInDB]:
    with db_session() as s:
        rows = s.scalars(select(UserRow).order_by(UserRow.created_at.desc())).all()
        return [_user_to_model(r) for r in rows]


_USER_UPDATABLE = {"name", "city", "industry", "is_active", "role", "whatsapp_phone"}


def update_user(user_id: str, updates: dict) -> Optional[UserInDB]:
    if not _is_uuid(user_id):
        return None
    with db_session() as s:
        row = s.get(UserRow, str(user_id))
        if not row:
            return None
        for key, value in updates.items():
            if key in _USER_UPDATABLE and value is not None:
                setattr(row, key, value.value if isinstance(value, UserRole) else value)
        row.updated_at = datetime.now(timezone.utc)
        s.flush()
        return _user_to_model(row)


def delete_user(user_id: str) -> bool:
    if not _is_uuid(user_id):
        return False
    with db_session() as s:
        result = s.execute(delete(UserRow).where(UserRow.id == str(user_id)))
        return result.rowcount > 0


def get_user_by_whatsapp_phone(phone: str) -> Optional[UserInDB]:
    with db_session() as s:
        row = s.scalar(select(UserRow).where(UserRow.whatsapp_phone == phone))
        return _user_to_model(row) if row else None


def set_user_whatsapp_phone(user_id: str, phone: Optional[str]) -> bool:
    if not _is_uuid(user_id):
        return False
    with db_session() as s:
        if phone:
            taken = s.scalar(
                select(UserRow).where(
                    UserRow.whatsapp_phone == phone, UserRow.id != str(user_id)
                )
            )
            if taken:
                return False
        row = s.get(UserRow, str(user_id))
        if not row:
            return False
        row.whatsapp_phone = phone
        row.updated_at = datetime.now(timezone.utc)
        return True


# === History Operations ===


def save_generation_history(history_item: GenerationHistoryItem) -> bool:
    if not _is_uuid(history_item.content_id) or not _is_uuid(history_item.user_id):
        logger.warning(
            f"Skipping history save: non-UUID ids "
            f"(content_id={history_item.content_id})"
        )
        return False
    with db_session() as s:
        row = s.get(GenerationHistoryRow, str(history_item.content_id))
        if row is None:
            row = GenerationHistoryRow(content_id=str(history_item.content_id))
            s.add(row)
        row.user_id = str(history_item.user_id)
        row.business_name = history_item.business_name
        row.content_type = history_item.content_type
        row.industry = history_item.industry
        row.city = history_item.city
        row.language = history_item.language
        row.tone = history_item.tone
        row.generated_content = history_item.generated_content
        row.tokens_used = history_item.tokens_used
        row.cost_usd = history_item.cost_usd
        row.generation_time_ms = history_item.generation_time_ms
        row.sources_used = history_item.sources_used or []
        row.is_saved = history_item.is_saved
        row.is_flagged = history_item.is_flagged
        row.source_channel = history_item.source_channel
        row.created_at = history_item.created_at
        row.updated_at = history_item.updated_at
    return True


def get_user_history(user_id: str, page: int = 1, page_size: int = 20) -> tuple:
    if not _is_uuid(user_id):
        return [], 0
    with db_session() as s:
        total = s.scalar(
            select(func.count())
            .select_from(GenerationHistoryRow)
            .where(GenerationHistoryRow.user_id == str(user_id))
        )
        rows = s.scalars(
            select(GenerationHistoryRow)
            .where(GenerationHistoryRow.user_id == str(user_id))
            .order_by(GenerationHistoryRow.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [_history_to_model(r) for r in rows], (total or 0)


def get_history_by_id(content_id: str) -> Optional[GenerationHistoryItem]:
    if not _is_uuid(content_id):
        return None
    with db_session() as s:
        row = s.get(GenerationHistoryRow, str(content_id))
        return _history_to_model(row) if row else None


def get_history_by_id_and_user(
    content_id: str, user_id: str
) -> Optional[GenerationHistoryItem]:
    if not _is_uuid(content_id) or not _is_uuid(user_id):
        return None
    with db_session() as s:
        row = s.scalar(
            select(GenerationHistoryRow).where(
                GenerationHistoryRow.content_id == str(content_id),
                GenerationHistoryRow.user_id == str(user_id),
            )
        )
        return _history_to_model(row) if row else None


_HISTORY_UPDATABLE = {
    "business_name",
    "content_type",
    "generated_content",
    "is_saved",
    "is_flagged",
}


def _apply_history_updates(row: GenerationHistoryRow, updates: dict) -> None:
    for key, value in updates.items():
        if key in _HISTORY_UPDATABLE and value is not None:
            setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc)


def update_history(content_id: str, updates: dict) -> bool:
    if not _is_uuid(content_id):
        return False
    with db_session() as s:
        row = s.get(GenerationHistoryRow, str(content_id))
        if not row:
            return False
        _apply_history_updates(row, updates)
        return True


def update_history_by_user(content_id: str, user_id: str, updates: dict) -> bool:
    if not _is_uuid(content_id) or not _is_uuid(user_id):
        return False
    with db_session() as s:
        row = s.scalar(
            select(GenerationHistoryRow).where(
                GenerationHistoryRow.content_id == str(content_id),
                GenerationHistoryRow.user_id == str(user_id),
            )
        )
        if not row:
            return False
        _apply_history_updates(row, updates)
        return True


def delete_history_item(content_id: str) -> bool:
    if not _is_uuid(content_id):
        return False
    with db_session() as s:
        result = s.execute(
            delete(GenerationHistoryRow).where(
                GenerationHistoryRow.content_id == str(content_id)
            )
        )
        return result.rowcount > 0


def delete_history_item_by_user(content_id: str, user_id: str) -> bool:
    if not _is_uuid(content_id) or not _is_uuid(user_id):
        return False
    with db_session() as s:
        result = s.execute(
            delete(GenerationHistoryRow).where(
                GenerationHistoryRow.content_id == str(content_id),
                GenerationHistoryRow.user_id == str(user_id),
            )
        )
        return result.rowcount > 0


def list_all_history(page: int = 1, page_size: int = 50) -> tuple:
    with db_session() as s:
        total = s.scalar(select(func.count()).select_from(GenerationHistoryRow))
        rows = s.scalars(
            select(GenerationHistoryRow)
            .order_by(GenerationHistoryRow.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [_history_to_model(r) for r in rows], (total or 0)


# === Document Metadata Operations ===


def save_document_metadata(metadata: dict) -> bool:
    with db_session() as s:
        s.add(
            DocumentRow(
                doc_id=str(metadata["doc_id"]),
                uploaded_by=str(metadata["uploaded_by"]),
                title=metadata.get("title", ""),
                category=metadata.get("category", "general"),
                tags=metadata.get("tags", []),
                filename=metadata.get("filename", ""),
                storage_path=metadata.get("storage_path"),
                file_path=metadata.get("file_path"),
                file_size_bytes=metadata.get("file_size_bytes", 0),
                word_count=metadata.get("word_count", 0),
                chunks_created=metadata.get("chunks_created", 0),
                status=metadata.get("status", "processed"),
                created_at=datetime.now(timezone.utc),
            )
        )
    return True


def get_all_documents() -> List[dict]:
    with db_session() as s:
        rows = s.scalars(
            select(DocumentRow).order_by(DocumentRow.created_at.desc())
        ).all()
        return [_document_to_dict(r) for r in rows]


def get_user_documents(user_id: str) -> List[dict]:
    if not _is_uuid(user_id):
        return []
    with db_session() as s:
        rows = s.scalars(
            select(DocumentRow)
            .where(DocumentRow.uploaded_by == str(user_id))
            .order_by(DocumentRow.created_at.desc())
        ).all()
        return [_document_to_dict(r) for r in rows]


def get_document_by_id(doc_id: str) -> Optional[dict]:
    if not _is_uuid(doc_id):
        return None
    with db_session() as s:
        row = s.get(DocumentRow, str(doc_id))
        return _document_to_dict(row) if row else None


def get_document_by_id_and_user(doc_id: str, user_id: str) -> Optional[dict]:
    if not _is_uuid(doc_id) or not _is_uuid(user_id):
        return None
    with db_session() as s:
        row = s.scalar(
            select(DocumentRow).where(
                DocumentRow.doc_id == str(doc_id),
                DocumentRow.uploaded_by == str(user_id),
            )
        )
        return _document_to_dict(row) if row else None


def delete_document_metadata(doc_id: str) -> bool:
    if not _is_uuid(doc_id):
        return False
    with db_session() as s:
        result = s.execute(
            delete(DocumentRow).where(DocumentRow.doc_id == str(doc_id))
        )
        return result.rowcount > 0


def delete_document_metadata_by_user(doc_id: str, user_id: str) -> bool:
    if not _is_uuid(doc_id) or not _is_uuid(user_id):
        return False
    with db_session() as s:
        result = s.execute(
            delete(DocumentRow).where(
                DocumentRow.doc_id == str(doc_id),
                DocumentRow.uploaded_by == str(user_id),
            )
        )
        return result.rowcount > 0


def get_document_categories() -> List[dict]:
    with db_session() as s:
        rows = s.execute(
            select(DocumentRow.category, func.count()).group_by(DocumentRow.category)
        ).all()
        return [{"category": c or "uncategorized", "count": n} for c, n in rows]


def get_user_document_categories(user_id: str) -> List[dict]:
    if not _is_uuid(user_id):
        return []
    with db_session() as s:
        rows = s.execute(
            select(DocumentRow.category, func.count())
            .where(DocumentRow.uploaded_by == str(user_id))
            .group_by(DocumentRow.category)
        ).all()
        return [{"category": c or "uncategorized", "count": n} for c, n in rows]


# === Image Gallery Operations ===


def save_image_record(record: dict):
    with db_session() as s:
        s.add(
            ImageRow(
                id=str(record["id"]),
                user_id=str(record["user_id"]),
                image_url=record.get("image_url", ""),
                image_type=record.get("image_type", "social_media"),
                source_content=record.get("source_content", ""),
                storage_path=record.get("storage_path"),
                created_at=datetime.now(timezone.utc),
            )
        )


def get_user_images(
    user_id: str, image_type: str = None, search: str = None
) -> list:
    if not _is_uuid(user_id):
        return []
    stmt = select(ImageRow).where(ImageRow.user_id == str(user_id))
    if image_type and image_type.lower() not in ("all", "none", ""):
        stmt = stmt.where(ImageRow.image_type == image_type)
    if search and search.strip():
        stmt = stmt.where(ImageRow.source_content.ilike(f"%{search.strip()}%"))
    stmt = stmt.order_by(ImageRow.created_at.desc())
    with db_session() as s:
        return [_image_to_dict(r) for r in s.scalars(stmt).all()]


def get_image_by_id(image_id: str, user_id: str) -> Optional[dict]:
    if not _is_uuid(image_id) or not _is_uuid(user_id):
        return None
    with db_session() as s:
        row = s.scalar(
            select(ImageRow).where(
                ImageRow.id == str(image_id), ImageRow.user_id == str(user_id)
            )
        )
        return _image_to_dict(row) if row else None


def delete_image_record(image_id: str, user_id: str) -> bool:
    if not _is_uuid(image_id) or not _is_uuid(user_id):
        return False
    with db_session() as s:
        result = s.execute(
            delete(ImageRow).where(
                ImageRow.id == str(image_id), ImageRow.user_id == str(user_id)
            )
        )
        return result.rowcount > 0


# === Agent Run Audit Operations ===


def save_agent_run(run_dict: dict) -> bool:
    """Persist an agent run audit record.

    Lenient on ids: the agent generates fresh UUIDs but a stray non-UUID id
    must not break the request, so we skip rather than raise (mirrors
    ``save_generation_history``).
    """
    rid = str(run_dict.get("id") or uuid4())
    uid = str(run_dict.get("user_id") or "")
    if not _is_uuid(rid) or not _is_uuid(uid):
        logger.warning(f"Skipping agent run save: non-UUID ids (id={rid}, user_id={uid})")
        return False

    created_at = run_dict.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at)
        except ValueError:
            created_at = None
    if created_at is None:
        created_at = datetime.now(timezone.utc)

    with db_session() as s:
        s.add(
            AgentRunRow(
                id=rid,
                user_id=uid,
                goal=str(run_dict.get("goal", "")),
                steps=run_dict.get("steps") or [],
                success=bool(run_dict.get("success", False)),
                created_at=created_at,
            )
        )
    return True


def list_agent_runs(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    stmt = select(AgentRunRow).order_by(AgentRunRow.created_at.desc())
    if user_id and _is_uuid(user_id):
        stmt = stmt.where(AgentRunRow.user_id == str(user_id))
    with db_session() as s:
        rows = s.scalars(stmt).all()
        return [
            {
                "id": str(r.id),
                "user_id": str(r.user_id),
                "goal": r.goal,
                "steps": r.steps or [],
                "success": r.success,
                "created_at": _iso(r.created_at),
            }
            for r in rows
        ]


# === WhatsApp Operations ===


def get_whatsapp_session(phone: str) -> Optional[dict]:
    with db_session() as s:
        row = s.get(WhatsAppSessionRow, phone)
        if not row:
            return None
        return {
            "phone": row.phone,
            "user_id": str(row.user_id) if row.user_id else None,
            "state": row.state,
            "context": row.context or {},
            "updated_at": _iso(row.updated_at),
        }


def upsert_whatsapp_session(
    phone: str,
    user_id: Optional[str],
    state: str,
    context: dict,
) -> dict:
    with db_session() as s:
        row = s.get(WhatsAppSessionRow, phone)
        if row is None:
            row = WhatsAppSessionRow(phone=phone)
            s.add(row)
        row.user_id = str(user_id) if user_id else None
        row.state = state
        row.context = context or {}
        row.updated_at = datetime.now(timezone.utc)
        s.flush()
        return {
            "phone": row.phone,
            "user_id": str(row.user_id) if row.user_id else None,
            "state": row.state,
            "context": row.context,
            "updated_at": _iso(row.updated_at),
        }


def delete_whatsapp_session(phone: str) -> bool:
    with db_session() as s:
        result = s.execute(
            delete(WhatsAppSessionRow).where(WhatsAppSessionRow.phone == phone)
        )
        return result.rowcount > 0


def create_whatsapp_link_code(user_id: str, ttl_minutes: int) -> dict:
    now = datetime.now(timezone.utc)
    with db_session() as s:
        # Only the newest code for a user should be usable.
        s.execute(
            delete(WhatsAppLinkCodeRow).where(
                WhatsAppLinkCodeRow.user_id == str(user_id)
            )
        )
        s.execute(
            delete(WhatsAppLinkCodeRow).where(WhatsAppLinkCodeRow.expires_at < now)
        )
        code = f"{secrets.randbelow(1000000):06d}"
        expires_at = now + timedelta(minutes=ttl_minutes)
        s.add(
            WhatsAppLinkCodeRow(
                code=code,
                user_id=str(user_id),
                expires_at=expires_at,
                created_at=now,
            )
        )
        return {
            "code": code,
            "user_id": str(user_id),
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat(),
        }


def consume_whatsapp_link_code(code: str) -> Optional[str]:
    now = datetime.now(timezone.utc)
    with db_session() as s:
        row = s.get(WhatsAppLinkCodeRow, code)
        if row is None or row.expires_at <= now:
            return None
        user_id = str(row.user_id)
        s.delete(row)
        return user_id


def mark_whatsapp_message_processed(message_id: str) -> bool:
    """Return True if this is the first time we have seen the message id.

    The primary key doubles as the lock: a duplicate insert raises and we treat
    that as "already processed".
    """
    from sqlalchemy.exc import IntegrityError

    try:
        with db_session() as s:
            s.execute(
                insert(WhatsAppProcessedMessageRow).values(
                    message_id=message_id,
                    processed_at=datetime.now(timezone.utc),
                )
            )
        return True
    except IntegrityError:
        return False


def prune_whatsapp_processed_messages(older_than_days: int = 7) -> int:
    """Meta stops retrying after 7 days, so older rows serve no purpose."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    with db_session() as s:
        result = s.execute(
            delete(WhatsAppProcessedMessageRow).where(
                WhatsAppProcessedMessageRow.processed_at < cutoff
            )
        )
        return result.rowcount or 0
