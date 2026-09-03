from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, Response, Query, Depends, HTTPException, status
from loguru import logger

from core.dependencies import get_current_user
from models.user import TokenPayload
from models.whatsapp import (
    WhatsAppConversation,
    WhatsAppMessage,
    WhatsAppSendRequest,
    WhatsAppSimulateRequest,
    WhatsAppSimulateResponse,
    WhatsAppSettings,
)
from db.json_store import (
    get_whatsapp_conversations,
    get_whatsapp_messages_by_phone,
    get_whatsapp_settings,
    update_whatsapp_settings,
    save_whatsapp_message,
)
from services.whatsapp_service import whatsapp_service
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Agent"])
alias_router = APIRouter(prefix="/api/whatsaap", tags=["WhatsApp Agent Alias"])


# === Meta Webhook Verification & Incoming Messages ===


@router.get("/webhook", summary="Meta WhatsApp Webhook Verification")
@alias_router.get("/webhook", summary="Meta WhatsApp Webhook Verification Alias")
async def verify_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Endpoint for Meta WhatsApp Cloud API Webhook verification.
    Meta sends GET request with hub.mode, hub.verify_token, hub.challenge.
    """
    challenge = whatsapp_service.verify_webhook(
        mode=hub_mode, token=hub_verify_token, challenge=hub_challenge
    )
    if challenge:
        # Must return the challenge string as plain text with 200 OK
        return Response(content=str(challenge), media_type="text/plain", status_code=200)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="WhatsApp webhook verification failed",
    )


@router.post("/webhook", summary="Meta WhatsApp Incoming Message Webhook")
@alias_router.post("/webhook", summary="Meta WhatsApp Incoming Message Webhook Alias")
async def receive_webhook(request: Request):
    """
    Webhook endpoint to receive incoming WhatsApp messages from Meta Cloud API.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    logger.info("Received WhatsApp webhook event")
    incoming_msgs = whatsapp_service.parse_meta_webhook_payload(payload)

    for msg_info in incoming_msgs:
        try:
            await whatsapp_service.handle_incoming_message(
                phone_number=msg_info["phone_number"],
                text=msg_info["text"],
                contact_name=msg_info.get("contact_name"),
                raw_payload=msg_info.get("raw_payload"),
            )
        except Exception as e:
            logger.error(f"Failed to process incoming WhatsApp message: {e}")

    # Meta expects 200 OK fast
    return {"status": "success", "processed_count": len(incoming_msgs)}


# === Dashboard & Simulation Endpoints ===


@router.post("/simulate", response_model=WhatsAppSimulateResponse, summary="Simulate WhatsApp Message")
async def simulate_message(
    payload: WhatsAppSimulateRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Simulate an incoming WhatsApp customer message and trigger the AI Agent response with RAG grounding.
    """
    user_msg, agent_msg, sources_used, exec_time = await whatsapp_service.handle_incoming_message(
        phone_number=payload.phone_number,
        text=payload.text,
        contact_name=payload.contact_name,
        use_rag=payload.use_rag,
    )

    return WhatsAppSimulateResponse(
        user_message=user_msg,
        agent_message=agent_msg,
        sources_used=sources_used,
        detected_language="Urdu / Roman Urdu / English",
        execution_time_seconds=exec_time,
    )


@router.get("/conversations", response_model=List[WhatsAppConversation], summary="List WhatsApp Conversations")
async def list_conversations(
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get all conversation threads grouped by phone number."""
    return get_whatsapp_conversations()


@router.get("/conversations/{phone_number}", response_model=List[WhatsAppMessage], summary="Get WhatsApp Thread")
async def get_conversation_thread(
    phone_number: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get full message thread for a given phone number."""
    return get_whatsapp_messages_by_phone(phone_number)


@router.post("/conversations/{phone_number}/send", response_model=WhatsAppMessage, summary="Send Manual Message")
async def send_manual_message(
    phone_number: str,
    payload: WhatsAppSendRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Send a manual agent reply from the dashboard."""
    msg_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    msg_dict = {
        "id": msg_id,
        "phone_number": phone_number,
        "sender": "agent",
        "text": payload.text,
        "timestamp": now_str,
        "rag_sources": [],
        "status": "sent",
    }
    save_whatsapp_message(msg_dict)

    # Also dispatch to Meta if configured
    await whatsapp_service.send_meta_whatsapp_message(
        to_phone=phone_number,
        text=payload.text,
    )

    return WhatsAppMessage(**msg_dict)


@router.get("/settings", response_model=WhatsAppSettings, summary="Get WhatsApp Settings")
async def get_settings(
    current_user: TokenPayload = Depends(get_current_user),
):
    """Get current WhatsApp bot configuration and credentials."""
    return get_whatsapp_settings()


@router.put("/settings", response_model=WhatsAppSettings, summary="Update WhatsApp Settings")
async def update_settings(
    payload: WhatsAppSettings,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Update WhatsApp bot configuration, credentials, and system instructions."""
    updated = update_whatsapp_settings(payload.model_dump())
    return WhatsAppSettings(**updated)
