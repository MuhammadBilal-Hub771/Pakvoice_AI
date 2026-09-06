"""WhatsApp Cloud API webhook.

Two contracts Meta imposes shape this module:

1. Verification is a GET with ``hub.*`` query parameters; the challenge must be
   echoed back as plain text.
2. Every POST must be answered with 200 quickly. Meta retries anything else for
   up to seven days, so message handling is queued as a background task and the
   response goes out immediately.
"""

import hashlib
import hmac

from fastapi import APIRouter, BackgroundTasks, Query, Request, Response, status
from fastapi.responses import PlainTextResponse
from loguru import logger

from config import settings
from db.json_store import mark_whatsapp_message_processed
from models.whatsapp import WhatsAppWebhookPayload
from services.whatsapp_bot import whatsapp_bot

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])


def _verify_signature(raw_body: bytes, header_value: str | None) -> bool:
    """Confirm the payload really came from Meta.

    Without this anyone who learns the webhook URL could drive the bot, burn
    OpenAI credit, and send messages as us.
    """
    if not header_value:
        return False
    if not settings.WHATSAPP_APP_SECRET:
        return False

    prefix = "sha256="
    if not header_value.startswith(prefix):
        return False
    provided = header_value[len(prefix) :]

    expected = hmac.new(
        settings.WHATSAPP_APP_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, provided)


@router.get(
    "/webhook",
    response_class=PlainTextResponse,
    summary="Meta webhook verification handshake",
)
async def verify_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
):
    if not settings.WHATSAPP_VERIFY_TOKEN:
        logger.error("WhatsApp verification attempted but WHATSAPP_VERIFY_TOKEN is unset")
        return PlainTextResponse(
            "not configured", status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    if hub_mode == "subscribe" and hmac.compare_digest(
        hub_verify_token or "", settings.WHATSAPP_VERIFY_TOKEN
    ):
        logger.info("WhatsApp webhook verified")
        return PlainTextResponse(hub_challenge or "")

    logger.warning("WhatsApp webhook verification failed")
    return PlainTextResponse("forbidden", status_code=status.HTTP_403_FORBIDDEN)


@router.post(
    "/webhook",
    summary="Receive WhatsApp messages",
)
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    raw_body = await request.body()

    if not _verify_signature(raw_body, request.headers.get("X-Hub-Signature-256")):
        logger.warning("Rejected WhatsApp webhook with an invalid signature")
        return Response(status_code=status.HTTP_403_FORBIDDEN)

    if not settings.whatsapp_configured:
        logger.error("WhatsApp webhook received but the integration is not configured")
        return Response(status_code=status.HTTP_200_OK)

    try:
        payload = WhatsAppWebhookPayload.model_validate_json(raw_body)
    except Exception as e:
        # Acknowledge anyway: retrying will not make an unparseable payload
        # parseable, and a non-200 keeps Meta knocking for a week.
        logger.error(f"Could not parse WhatsApp webhook payload: {e}")
        return Response(status_code=status.HTTP_200_OK)

    for message in payload.incoming_messages():
        if not message.id:
            continue
        # Duplicate delivery is normal; the insert doubles as the lock.
        if not mark_whatsapp_message_processed(message.id):
            logger.info(f"Skipping already-processed WhatsApp message {message.id}")
            continue
        background_tasks.add_task(whatsapp_bot.handle_message, message)

    return Response(status_code=status.HTTP_200_OK)
