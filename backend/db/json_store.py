import json
import os
from datetime import datetime, timezone
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
    users = _read_json(USERS_FILE)
    if not users:
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
        users = [admin_user.model_dump(), client_user.model_dump()]
        _write_json(USERS_FILE, users)
        logger.info("Seeded default users")


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


def create_user(user_data: UserCreate) -> UserInDB:
    users = _read_json(USERS_FILE)
    new_user = UserInDB(
        id=str(uuid4()),
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        city=user_data.city,
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
    return [
        {"category": cat, "count": cnt} for cat, cnt in categories.items()
    ]


def get_user_document_categories(user_id: str) -> List[dict]:
    docs = get_user_documents(user_id)
    categories = {}
    for d in docs:
        cat = d.get("category", "uncategorized")
        categories[cat] = categories.get(cat, 0) + 1
    return [
        {"category": cat, "count": cnt} for cat, cnt in categories.items()
    ]


# Initialize on import
_seed_users()


# === Image Gallery Operations ===


def save_image_record(record: dict):
    """Save an image gallery record."""
    images = _read_json(IMAGES_FILE)
    images.append(record)
    _write_json(IMAGES_FILE, images)


def get_user_images(user_id: str, image_type: str = None, search: str = None) -> list:
    """Get saved images for a user, with optional type/search filtering."""
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

    # Sort newest first
    filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return filtered


def delete_image_record(image_id: str, user_id: str) -> bool:
    """Delete an image record if it belongs to the user."""
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
