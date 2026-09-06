"""JSON file store — the original persistence layer.

Kept as the fallback for local development when SUPABASE_DB_URL is not set.
``db/json_store.py`` dispatches to either this module or ``db/sql_store.py``.

Not suitable for production: every call rewrites the whole file and there is no
locking, so concurrent writes lose data.
"""

import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4

from loguru import logger

from config import settings
from core.security import hash_password, verify_password
from models.user import UserCreate, UserInDB, UserRole
from models.history import GenerationHistoryItem


DATA_DIR = "./data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
DOCUMENTS_FILE = os.path.join(DATA_DIR, "documents.json")
IMAGES_FILE = os.path.join(DATA_DIR, "images.json")
AGENT_RUNS_FILE = os.path.join(DATA_DIR, "agent_runs.json")
WHATSAPP_SESSIONS_FILE = os.path.join(DATA_DIR, "whatsapp_sessions.json")
WHATSAPP_CODES_FILE = os.path.join(DATA_DIR, "whatsapp_link_codes.json")
WHATSAPP_PROCESSED_FILE = os.path.join(DATA_DIR, "whatsapp_processed.json")


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _read_json(filepath: str) -> List[Dict[str, Any]]:
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def _write_json(filepath: str, data: List[Dict[str, Any]]):
    _ensure_data_dir()
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _seed_users():
    """Create demo accounts on an empty store.

    Only runs in DEBUG. Shipping known credentials to a production deployment
    would hand anyone an admin account.
    """
    users = _read_json(USERS_FILE)
    if users:
        return
    if not settings.DEBUG:
        logger.warning(
            "User store is empty and DEBUG is off — skipping demo user seeding. "
            "Register the first account via POST /api/auth/register."
        )
        return

    admin_user = UserInDB(
        id=str(uuid4()),
        name="Admin User",
        email="admin@contentpk.ai",
        hashed_password=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        city="Islamabad",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    client_user = UserInDB(
        id=str(uuid4()),
        name="Client User",
        email="client@contentpk.ai",
        hashed_password=hash_password("Client@123"),
        role=UserRole.CLIENT,
        city="Karachi",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    _write_json(USERS_FILE, [admin_user.model_dump(), client_user.model_dump()])
    logger.info("Seeded default dev users")


# === User Operations ===


def get_user_by_email(email: str) -> Optional[UserInDB]:
    users = _read_json(USERS_FILE)
    for user_data in users:
        if user_data["email"] == email:
            return UserInDB(**user_data)
    return None


def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    users = _read_json(USERS_FILE)
    for user_data in users:
        if user_data["id"] == user_id:
            return UserInDB(**user_data)
    return None


def create_user(user_data: UserCreate, role: UserRole = UserRole.CLIENT) -> UserInDB:
    users = _read_json(USERS_FILE)
    new_user = UserInDB(
        id=str(uuid4()),
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=role,
        city=user_data.city,
        industry=user_data.industry,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    users.append(new_user.model_dump())
    _write_json(USERS_FILE, users)
    return new_user


def create_oauth_user(email: str, name: str, city: str = "") -> UserInDB:
    """Create a passwordless user for a federated (Google) login."""
    users = _read_json(USERS_FILE)
    new_user = UserInDB(
        id=str(uuid4()),
        name=name,
        email=email,
        hashed_password="",
        role=UserRole.CLIENT,
        city=city,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    users.append(new_user.model_dump())
    _write_json(USERS_FILE, users)
    return new_user


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
    users_data = _read_json(USERS_FILE)
    return [UserInDB(**u) for u in users_data]


def update_user(user_id: str, updates: dict) -> Optional[UserInDB]:
    users = _read_json(USERS_FILE)
    for i, u in enumerate(users):
        if u["id"] == user_id:
            user = UserInDB(**u)
            for key, value in updates.items():
                if hasattr(user, key) and value is not None:
                    setattr(user, key, value)
            user.updated_at = datetime.now(timezone.utc)
            users[i] = user.model_dump()
            _write_json(USERS_FILE, users)
            return user
    return None


def delete_user(user_id: str) -> bool:
    users = _read_json(USERS_FILE)
    filtered = [u for u in users if u["id"] != user_id]
    if len(filtered) == len(users):
        return False
    _write_json(USERS_FILE, filtered)
    return True


def get_user_by_whatsapp_phone(phone: str) -> Optional[UserInDB]:
    users = _read_json(USERS_FILE)
    for user_data in users:
        if user_data.get("whatsapp_phone") == phone:
            return UserInDB(**user_data)
    return None


def set_user_whatsapp_phone(user_id: str, phone: Optional[str]) -> bool:
    users = _read_json(USERS_FILE)
    # One phone number can only map to one account.
    for u in users:
        if phone and u.get("whatsapp_phone") == phone and u["id"] != user_id:
            return False
    for i, u in enumerate(users):
        if u["id"] == user_id:
            users[i]["whatsapp_phone"] = phone
            users[i]["updated_at"] = str(datetime.now(timezone.utc))
            _write_json(USERS_FILE, users)
            return True
    return False


# === History Operations ===


def save_generation_history(history_item: GenerationHistoryItem) -> bool:
    history = _read_json(HISTORY_FILE)
    existing = [h for h in history if h["content_id"] != history_item.content_id]
    existing.append(history_item.model_dump())
    _write_json(HISTORY_FILE, existing)
    return True


def get_user_history(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
) -> tuple:
    history = _read_json(HISTORY_FILE)
    user_history = [h for h in history if h["user_id"] == user_id]
    user_history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(user_history)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = user_history[start:end]
    items = [GenerationHistoryItem(**h) for h in page_items]
    return items, total


def get_history_by_id(content_id: str) -> Optional[GenerationHistoryItem]:
    history = _read_json(HISTORY_FILE)
    for h in history:
        if h["content_id"] == content_id:
            return GenerationHistoryItem(**h)
    return None


def get_history_by_id_and_user(
    content_id: str, user_id: str
) -> Optional[GenerationHistoryItem]:
    history = _read_json(HISTORY_FILE)
    for h in history:
        if h["content_id"] == content_id and h.get("user_id") == user_id:
            return GenerationHistoryItem(**h)
    return None


def update_history(content_id: str, updates: dict) -> bool:
    history = _read_json(HISTORY_FILE)
    for i, h in enumerate(history):
        if h["content_id"] == content_id:
            for key, value in updates.items():
                if value is not None:
                    history[i][key] = value
            history[i]["updated_at"] = str(datetime.now(timezone.utc))
            _write_json(HISTORY_FILE, history)
            return True
    return False


def update_history_by_user(content_id: str, user_id: str, updates: dict) -> bool:
    history = _read_json(HISTORY_FILE)
    for i, h in enumerate(history):
        if h["content_id"] == content_id and h.get("user_id") == user_id:
            for key, value in updates.items():
                if value is not None:
                    history[i][key] = value
            history[i]["updated_at"] = str(datetime.now(timezone.utc))
            _write_json(HISTORY_FILE, history)
            return True
    return False


def delete_history_item(content_id: str) -> bool:
    history = _read_json(HISTORY_FILE)
    filtered = [h for h in history if h["content_id"] != content_id]
    if len(filtered) == len(history):
        return False
    _write_json(HISTORY_FILE, filtered)
    return True


def delete_history_item_by_user(content_id: str, user_id: str) -> bool:
    history = _read_json(HISTORY_FILE)
    original_len = len(history)
    history = [
        h
        for h in history
        if not (h["content_id"] == content_id and h.get("user_id") == user_id)
    ]
    if len(history) == original_len:
        return False
    _write_json(HISTORY_FILE, history)
    return True


def list_all_history(page: int = 1, page_size: int = 50) -> tuple:
    history = _read_json(HISTORY_FILE)
    history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(history)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = history[start:end]
    items = [GenerationHistoryItem(**h) for h in page_items]
    return items, total


# === Document Metadata Operations ===


def save_document_metadata(metadata: dict) -> bool:
    docs = _read_json(DOCUMENTS_FILE)
    docs.append(metadata)
    _write_json(DOCUMENTS_FILE, docs)
    return True


def get_all_documents() -> List[dict]:
    return _read_json(DOCUMENTS_FILE)


def get_user_documents(user_id: str) -> List[dict]:
    docs = _read_json(DOCUMENTS_FILE)
    return [d for d in docs if d.get("uploaded_by") == user_id]


def get_document_by_id(doc_id: str) -> Optional[dict]:
    docs = _read_json(DOCUMENTS_FILE)
    for d in docs:
        if d["doc_id"] == doc_id:
            return d
    return None


def get_document_by_id_and_user(doc_id: str, user_id: str) -> Optional[dict]:
    docs = _read_json(DOCUMENTS_FILE)
    for d in docs:
        if d["doc_id"] == doc_id and d.get("uploaded_by") == user_id:
            return d
    return None


def delete_document_metadata(doc_id: str) -> bool:
    docs = _read_json(DOCUMENTS_FILE)
    filtered = [d for d in docs if d["doc_id"] != doc_id]
    if len(filtered) == len(docs):
        return False
    _write_json(DOCUMENTS_FILE, filtered)
    return True


def delete_document_metadata_by_user(doc_id: str, user_id: str) -> bool:
    docs = _read_json(DOCUMENTS_FILE)
    original_len = len(docs)
    docs = [
        d
        for d in docs
        if not (d["doc_id"] == doc_id and d.get("uploaded_by") == user_id)
    ]
    if len(docs) == original_len:
        return False
    _write_json(DOCUMENTS_FILE, docs)
    return True


def get_document_categories() -> List[dict]:
    docs = _read_json(DOCUMENTS_FILE)
    categories = {}
    for d in docs:
        cat = d.get("category", "uncategorized")
        categories[cat] = categories.get(cat, 0) + 1
    return [{"category": cat, "count": cnt} for cat, cnt in categories.items()]


def get_user_document_categories(user_id: str) -> List[dict]:
    docs = get_user_documents(user_id)
    categories = {}
    for d in docs:
        cat = d.get("category", "uncategorized")
        categories[cat] = categories.get(cat, 0) + 1
    return [{"category": cat, "count": cnt} for cat, cnt in categories.items()]


# === Image Gallery Operations ===


def save_image_record(record: dict):
    images = _read_json(IMAGES_FILE)
    images.append(record)
    _write_json(IMAGES_FILE, images)


def get_user_images(
    user_id: str, image_type: str = None, search: str = None
) -> list:
    images = _read_json(IMAGES_FILE)

    filtered = [img for img in images if img.get("user_id") == user_id]

    if image_type and image_type.lower() not in ("all", "none", ""):
        filtered = [img for img in filtered if img.get("image_type") == image_type]

    if search and search.strip():
        search_lower = search.lower()
        filtered = [
            img
            for img in filtered
            if search_lower in (img.get("source_content", "") or "").lower()
        ]

    filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return filtered


def get_image_by_id(image_id: str, user_id: str) -> Optional[dict]:
    images = _read_json(IMAGES_FILE)
    for img in images:
        if img.get("id") == image_id and img.get("user_id") == user_id:
            return img
    return None


def delete_image_record(image_id: str, user_id: str) -> bool:
    images = _read_json(IMAGES_FILE)
    original_len = len(images)
    images = [
        img
        for img in images
        if not (img.get("id") == image_id and img.get("user_id") == user_id)
    ]
    if len(images) == original_len:
        return False
    _write_json(IMAGES_FILE, images)
    return True


# === Agent Run Audit Operations ===


def save_agent_run(run_dict: dict) -> bool:
    """Append an agent run audit record (id, user_id, goal, steps, success)."""
    runs = _read_json(AGENT_RUNS_FILE)
    runs.append(run_dict)
    _write_json(AGENT_RUNS_FILE, runs)
    return True


def list_agent_runs(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    runs = _read_json(AGENT_RUNS_FILE)
    if user_id:
        runs = [r for r in runs if r.get("user_id") == user_id]
    return runs


# === WhatsApp Operations ===


def get_whatsapp_session(phone: str) -> Optional[dict]:
    sessions = _read_json(WHATSAPP_SESSIONS_FILE)
    for s in sessions:
        if s.get("phone") == phone:
            return s
    return None


def upsert_whatsapp_session(
    phone: str,
    user_id: Optional[str],
    state: str,
    context: dict,
) -> dict:
    sessions = _read_json(WHATSAPP_SESSIONS_FILE)
    record = {
        "phone": phone,
        "user_id": user_id,
        "state": state,
        "context": context,
        "updated_at": str(datetime.now(timezone.utc)),
    }
    for i, s in enumerate(sessions):
        if s.get("phone") == phone:
            sessions[i] = record
            break
    else:
        sessions.append(record)
    _write_json(WHATSAPP_SESSIONS_FILE, sessions)
    return record


def delete_whatsapp_session(phone: str) -> bool:
    sessions = _read_json(WHATSAPP_SESSIONS_FILE)
    filtered = [s for s in sessions if s.get("phone") != phone]
    if len(filtered) == len(sessions):
        return False
    _write_json(WHATSAPP_SESSIONS_FILE, filtered)
    return True


def create_whatsapp_link_code(user_id: str, ttl_minutes: int) -> dict:
    codes = _read_json(WHATSAPP_CODES_FILE)
    now = datetime.now(timezone.utc)
    # Drop this user's previous codes so only the newest one works.
    codes = [
        c
        for c in codes
        if c.get("user_id") != user_id
        and datetime.fromisoformat(c["expires_at"]) > now
    ]
    code = f"{secrets.randbelow(1000000):06d}"
    record = {
        "code": code,
        "user_id": user_id,
        "expires_at": (now + timedelta(minutes=ttl_minutes)).isoformat(),
        "created_at": now.isoformat(),
    }
    codes.append(record)
    _write_json(WHATSAPP_CODES_FILE, codes)
    return record


def consume_whatsapp_link_code(code: str) -> Optional[str]:
    codes = _read_json(WHATSAPP_CODES_FILE)
    now = datetime.now(timezone.utc)
    user_id = None
    remaining = []
    for c in codes:
        expires = datetime.fromisoformat(c["expires_at"])
        if c.get("code") == code and expires > now:
            user_id = c.get("user_id")
            continue
        if expires > now:
            remaining.append(c)
    _write_json(WHATSAPP_CODES_FILE, remaining)
    return user_id


def mark_whatsapp_message_processed(message_id: str) -> bool:
    """Return True if this is the first time we have seen the message id."""
    processed = _read_json(WHATSAPP_PROCESSED_FILE)
    if any(p.get("message_id") == message_id for p in processed):
        return False
    processed.append(
        {
            "message_id": message_id,
            "processed_at": str(datetime.now(timezone.utc)),
        }
    )
    # Unbounded growth is pointless here; keep a rolling window.
    if len(processed) > 5000:
        processed = processed[-5000:]
    _write_json(WHATSAPP_PROCESSED_FILE, processed)
    return True
