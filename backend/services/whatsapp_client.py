"""Thin wrapper over the Meta WhatsApp Cloud API Graph endpoints.

Only covers what the bot needs: sending text, images and interactive replies,
and downloading inbound media.

Sending is best-effort and never raises into the caller. The webhook has
already returned 200 by the time these run, so a failed send is logged rather
than propagated — there is nobody left to report it to.

Note on the 24-hour window: free-form messages are only allowed within 24 hours
of the user's last message. The bot is purely reactive, so replies always fall
inside that window. Any proactive outbound message would need a Meta-approved
template instead.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import dotenv_values
from loguru import logger

from config import settings

_GRAPH_BASE = "https://graph.facebook.com"
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

# WhatsApp hard limits
MAX_TEXT_LENGTH = 4096
MAX_BUTTONS = 3
MAX_BUTTON_TITLE = 20
MAX_LIST_ROWS = 10
MAX_ROW_TITLE = 24
MAX_ROW_DESCRIPTION = 72


def _live_whatsapp_env() -> Dict[str, Optional[str]]:
    """Prefer current ``.env`` values so a token refresh does not need a full
    process restart during local development."""
    file_vals = dotenv_values(_ENV_FILE)
    return {
        "api_version": (file_vals.get("WHATSAPP_API_VERSION") or settings.WHATSAPP_API_VERSION),
        "phone_number_id": (
            file_vals.get("WHATSAPP_PHONE_NUMBER_ID") or settings.WHATSAPP_PHONE_NUMBER_ID
        ),
        "access_token": (
            file_vals.get("WHATSAPP_ACCESS_TOKEN") or settings.WHATSAPP_ACCESS_TOKEN
        ),
    }


def _messages_url() -> str:
    env = _live_whatsapp_env()
    return (
        f"{_GRAPH_BASE}/{env['api_version']}/{env['phone_number_id']}/messages"
    )


def _headers() -> Dict[str, str]:
    env = _live_whatsapp_env()
    return {
        "Authorization": f"Bearer {env['access_token']}",
        "Content-Type": "application/json",
    }


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "\u2026"


async def _post(payload: Dict[str, Any]) -> bool:
    if not settings.whatsapp_configured:
        logger.warning("WhatsApp is not configured — dropping outbound message")
        return False
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _messages_url(), headers=_headers(), json=payload
            )
        if response.status_code >= 400:
            logger.error(
                f"WhatsApp send failed ({response.status_code}): {response.text}"
            )
            return False
        return True
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return False


def split_text(text: str) -> List[str]:
    """Break text into chunks that fit WhatsApp's per-message limit.

    Prefers paragraph then line boundaries so generated content stays readable.
    """
    text = text or ""
    if len(text) <= MAX_TEXT_LENGTH:
        return [text] if text else []

    chunks: List[str] = []
    remaining = text
    while len(remaining) > MAX_TEXT_LENGTH:
        window = remaining[:MAX_TEXT_LENGTH]
        split_at = window.rfind("\n\n")
        if split_at < MAX_TEXT_LENGTH // 2:
            split_at = window.rfind("\n")
        if split_at < MAX_TEXT_LENGTH // 2:
            split_at = window.rfind(" ")
        if split_at <= 0:
            split_at = MAX_TEXT_LENGTH
        chunks.append(remaining[:split_at].strip())
        remaining = remaining[split_at:].lstrip()
    if remaining:
        chunks.append(remaining)
    return chunks


async def send_text(to: str, text: str) -> bool:
    """Send a plain text message, splitting it if it exceeds the length limit."""
    parts = split_text(text)
    if not parts:
        return False
    ok = True
    for part in parts:
        sent = await _post(
            {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {"preview_url": False, "body": part},
            }
        )
        ok = ok and sent
    return ok


async def send_buttons(
    to: str,
    body: str,
    buttons: List[Dict[str, str]],
    header: Optional[str] = None,
    footer: Optional[str] = None,
) -> bool:
    """Send up to three reply buttons. ``buttons`` items are {id, title}."""
    payload: Dict[str, Any] = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": _truncate(body, 1024)},
            "action": {
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {
                            "id": b["id"],
                            "title": _truncate(b["title"], MAX_BUTTON_TITLE),
                        },
                    }
                    for b in buttons[:MAX_BUTTONS]
                ]
            },
        },
    }
    if header:
        payload["interactive"]["header"] = {
            "type": "text",
            "text": _truncate(header, 60),
        }
    if footer:
        payload["interactive"]["footer"] = {"text": _truncate(footer, 60)}
    return await _post(payload)


async def send_list(
    to: str,
    body: str,
    button_text: str,
    rows: List[Dict[str, str]],
    header: Optional[str] = None,
    footer: Optional[str] = None,
) -> bool:
    """Send a single-section list. ``rows`` items are {id, title, description}."""
    payload: Dict[str, Any] = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "body": {"text": _truncate(body, 1024)},
            "action": {
                "button": _truncate(button_text, MAX_BUTTON_TITLE),
                "sections": [
                    {
                        "title": _truncate(header or "Options", 24),
                        "rows": [
                            {
                                "id": r["id"],
                                "title": _truncate(r["title"], MAX_ROW_TITLE),
                                "description": _truncate(
                                    r.get("description", ""), MAX_ROW_DESCRIPTION
                                ),
                            }
                            for r in rows[:MAX_LIST_ROWS]
                        ],
                    }
                ],
            },
        },
    }
    if header:
        payload["interactive"]["header"] = {
            "type": "text",
            "text": _truncate(header, 60),
        }
    if footer:
        payload["interactive"]["footer"] = {"text": _truncate(footer, 60)}
    return await _post(payload)


async def send_image(to: str, image_url: str, caption: str = "") -> bool:
    """Send an image by URL.

    Meta fetches the URL itself, so it must be publicly reachable. Supabase
    signed URLs qualify; a localhost path does not.
    """
    payload: Dict[str, Any] = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "image",
        "image": {"link": image_url},
    }
    if caption:
        payload["image"]["caption"] = _truncate(caption, 1024)
    return await _post(payload)


async def send_image_id(to: str, media_id: str, caption: str = "") -> bool:
    """Send an image that was previously uploaded to Meta via ``upload_media``."""
    payload: Dict[str, Any] = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "image",
        "image": {"id": media_id},
    }
    if caption:
        payload["image"]["caption"] = _truncate(caption, 1024)
    return await _post(payload)


async def upload_media(
    file_bytes: bytes, mime_type: str, filename: str
) -> Optional[str]:
    """Upload a file to WhatsApp Cloud API and return the media id.

    Prefer this over ``send_image`` with a link when the file only exists on
    local disk — Meta never has to fetch our server.
    """
    env = _live_whatsapp_env()
    if not env.get("access_token") or not env.get("phone_number_id"):
        logger.warning("WhatsApp is not configured — cannot upload media")
        return None

    url = (
        f"{_GRAPH_BASE}/{env['api_version']}/{env['phone_number_id']}/media"
    )
    headers = {"Authorization": f"Bearer {env['access_token']}"}
    files = {
        "file": (filename or "file.bin", file_bytes, mime_type or "application/octet-stream"),
    }
    data = {"messaging_product": "whatsapp", "type": mime_type}

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(url, headers=headers, data=data, files=files)
        if response.status_code >= 400:
            logger.error(
                f"WhatsApp media upload failed ({response.status_code}): {response.text}"
            )
            return None
        media_id = response.json().get("id")
        if not media_id:
            logger.error(f"WhatsApp media upload returned no id: {response.text}")
            return None
        return media_id
    except Exception as e:
        logger.error(f"WhatsApp media upload error: {e}")
        return None


async def mark_read(message_id: str) -> bool:
    """Show the blue ticks so the user knows the bot picked the message up."""
    return await _post(
        {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
    )


async def download_media(media_id: str) -> Optional[tuple[bytes, str, str]]:
    """Fetch inbound media in two steps, as the Graph API requires.

    First resolve the media id to a short-lived download URL, then fetch that
    URL with the same bearer token.

    Returns ``(content, mime_type, filename)`` or None.
    """
    env = _live_whatsapp_env()
    if not env.get("access_token"):
        return None

    url = f"{_GRAPH_BASE}/{env['api_version']}/{media_id}"
    auth = {"Authorization": f"Bearer {env['access_token']}"}

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            meta_resp = await client.get(url, headers=auth)
            meta_resp.raise_for_status()
            meta = meta_resp.json()

            download_url = meta.get("url")
            if not download_url:
                logger.error(f"No download URL for media {media_id}: {meta}")
                return None

            mime_type = meta.get("mime_type", "application/octet-stream")

            # The CDN URL still needs the app token; it is not a public link.
            file_resp = await client.get(download_url, headers=auth)
            file_resp.raise_for_status()

            filename = meta.get("file_name") or f"{media_id}{_ext_for(mime_type)}"
            return file_resp.content, mime_type, filename

    except Exception as e:
        logger.error(f"Failed to download WhatsApp media {media_id}: {e}")
        return None


_MIME_EXT = {
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/amr": ".amr",
    "audio/aac": ".aac",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


def _ext_for(mime_type: str) -> str:
    # WhatsApp sends voice notes as "audio/ogg; codecs=opus"
    base = (mime_type or "").split(";")[0].strip().lower()
    return _MIME_EXT.get(base, "")
