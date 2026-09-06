"""File storage for knowledge base uploads and generated images.

Uses Supabase Storage when SUPABASE_URL and SUPABASE_SERVICE_KEY are set, and
the local filesystem otherwise.

Local disk is not durable on a redeployed VPS or an ephemeral container, so
production should always run with Supabase configured. Records carry both
``storage_path`` and ``file_path`` so files uploaded before the switch stay
readable and deletable.
"""

import mimetypes
import os
from typing import Any, Dict, Optional

from loguru import logger

from config import settings

_client = None


def _get_client():
    """Lazily build the Supabase client so an unconfigured app still boots."""
    global _client
    if _client is None:
        if not settings.use_supabase_storage:
            raise RuntimeError("Supabase Storage is not configured")
        from supabase import create_client

        _client = create_client(
            settings.SUPABASE_URL.strip(),
            settings.SUPABASE_SERVICE_KEY.strip(),
        )
        logger.info("Supabase Storage client initialized")
    return _client


def _content_type(filename: str, default: str = "application/octet-stream") -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or default


def _upload(bucket: str, path: str, data: bytes, content_type: str) -> bool:
    try:
        _get_client().storage.from_(bucket).upload(
            path,
            data,
            {"content-type": content_type, "upsert": "true"},
        )
        return True
    except Exception as e:
        logger.error(f"Supabase upload failed ({bucket}/{path}): {e}")
        return False


def _signed_url(bucket: str, path: str) -> Optional[str]:
    try:
        result = _get_client().storage.from_(bucket).create_signed_url(
            path, settings.SIGNED_URL_TTL_SECONDS
        )
        # The key name has changed between client versions.
        if isinstance(result, dict):
            return (
                result.get("signedURL")
                or result.get("signedUrl")
                or result.get("signed_url")
            )
        return None
    except Exception as e:
        logger.error(f"Failed to sign URL for {bucket}/{path}: {e}")
        return None


def _remove(bucket: str, path: str) -> bool:
    try:
        _get_client().storage.from_(bucket).remove([path])
        return True
    except Exception as e:
        logger.warning(f"Supabase delete failed ({bucket}/{path}): {e}")
        return False


# === Knowledge base documents ===


def save_document(file_bytes: bytes, doc_id: str, ext: str, filename: str = "") -> Dict[str, Any]:
    """Persist an uploaded document. Returns the fields to store on the record."""
    safe_name = f"{doc_id}{ext}"

    if settings.use_supabase_storage:
        path = f"{doc_id}/{safe_name}"
        if _upload(
            settings.SUPABASE_DOCUMENTS_BUCKET,
            path,
            file_bytes,
            _content_type(filename or safe_name),
        ):
            return {"storage_path": path, "file_path": None}
        logger.warning("Falling back to local disk for document storage")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    local_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return {"storage_path": None, "file_path": local_path}


def delete_document(record: Dict[str, Any]) -> bool:
    storage_path = record.get("storage_path")
    if storage_path:
        return _remove(settings.SUPABASE_DOCUMENTS_BUCKET, storage_path)

    file_path = record.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            return True
        except OSError as e:
            logger.warning(f"Failed to delete local file {file_path}: {e}")
    return False


# === Generated images ===


def save_image(image_bytes: bytes, image_id: str, ext: str = ".png") -> Dict[str, Any]:
    """Persist an image. ``image_url`` is what the client should load."""
    safe_name = f"{image_id}{ext}"

    if settings.use_supabase_storage:
        path = f"{image_id}/{safe_name}"
        if _upload(
            settings.SUPABASE_IMAGES_BUCKET,
            path,
            image_bytes,
            _content_type(safe_name, "image/png"),
        ):
            url = _signed_url(settings.SUPABASE_IMAGES_BUCKET, path)
            if url:
                return {"storage_path": path, "image_url": url}
        logger.warning("Falling back to local disk for image storage")

    os.makedirs(settings.IMAGE_STORAGE_DIR, exist_ok=True)
    local_path = os.path.join(settings.IMAGE_STORAGE_DIR, safe_name)
    with open(local_path, "wb") as f:
        f.write(image_bytes)
    return {"storage_path": None, "image_url": f"/static/images/{safe_name}"}


def refresh_image_url(record: Dict[str, Any]) -> str:
    """Return a currently valid URL for a stored image.

    Signed URLs expire, so gallery listings re-sign rather than returning the
    URL that was saved with the record.
    """
    storage_path = record.get("storage_path")
    if storage_path and settings.use_supabase_storage:
        url = _signed_url(settings.SUPABASE_IMAGES_BUCKET, storage_path)
        if url:
            return url
    return record.get("image_url", "")


def delete_image(record: Dict[str, Any]) -> bool:
    storage_path = record.get("storage_path")
    if storage_path:
        return _remove(settings.SUPABASE_IMAGES_BUCKET, storage_path)

    image_id = record.get("id")
    if not image_id:
        return False
    deleted = False
    for ext in (".png", ".svg"):
        local_path = os.path.join(settings.IMAGE_STORAGE_DIR, f"{image_id}{ext}")
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                deleted = True
            except OSError as e:
                logger.warning(f"Could not delete image file {local_path}: {e}")
    return deleted
