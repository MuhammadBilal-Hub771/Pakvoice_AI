import os
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

import httpx
from loguru import logger
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from config import settings
from db.json_store import (
    save_whatsapp_message,
    get_whatsapp_messages_by_phone,
    get_whatsapp_settings,
)
from models.whatsapp import DocumentSourceRef, WhatsAppMessage
from services.rag_service import rag_service


class WhatsAppService:
    def __init__(self):
        self._llm: Optional[ChatOpenAI] = None

    def _get_llm(self) -> ChatOpenAI:
        http_client = httpx.Client(trust_env=False, timeout=30.0)
        http_async_client = httpx.AsyncClient(trust_env=False, timeout=30.0)
        return ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=0.4,
            max_tokens=800,
            openai_api_key=settings.OPENAI_API_KEY,
            request_timeout=30,
            http_client=http_client,
            http_async_client=http_async_client,
        )

    def verify_webhook(
        self, mode: Optional[str], token: Optional[str], challenge: Optional[str]
    ) -> Optional[str]:
        """Verify Meta WhatsApp webhook subscription."""
        current_settings = get_whatsapp_settings()
        expected_token = current_settings.get("verify_token") or settings.WHATSAPP_VERIFY_TOKEN

        if mode == "subscribe" and token == expected_token:
            logger.info("WhatsApp webhook verified successfully")
            return challenge
        logger.warning(f"WhatsApp webhook verification failed. Received mode={mode}, token={token}")
        return None

    def parse_meta_webhook_payload(
        self, payload: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Parse incoming messages from Meta WhatsApp webhook payload."""
        messages_extracted = []
        try:
            entries = payload.get("entry", [])
            for entry in entries:
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    contacts = value.get("contacts", [])
                    contact_name = contacts[0].get("profile", {}).get("name") if contacts else "Customer"
                    
                    incoming_messages = value.get("messages", [])
                    for msg in incoming_messages:
                        sender = msg.get("from")
                        msg_id = msg.get("id")
                        msg_type = msg.get("type")
                        
                        text = ""
                        if msg_type == "text":
                            text = msg.get("text", {}).get("body", "")
                        elif msg_type == "interactive":
                            interactive = msg.get("interactive", {})
                            if "button_reply" in interactive:
                                text = interactive["button_reply"].get("title", "")
                            elif "list_reply" in interactive:
                                text = interactive["list_reply"].get("title", "")
                        elif msg_type == "button":
                            text = msg.get("button", {}).get("text", "")
                        elif msg_type in ("image", "document", "audio", "video"):
                            caption = msg.get(msg_type, {}).get("caption", "")
                            text = caption if caption else f"[{msg_type.capitalize()} attachment]"

                        if sender and text:
                            messages_extracted.append({
                                "phone_number": sender,
                                "contact_name": contact_name,
                                "message_id": msg_id,
                                "text": text,
                                "raw_payload": msg,
                            })
        except Exception as e:
            logger.error(f"Error parsing Meta webhook payload: {e}")

        return messages_extracted

    async def handle_incoming_message(
        self,
        phone_number: str,
        text: str,
        contact_name: Optional[str] = None,
        use_rag: Optional[bool] = None,
        raw_payload: Optional[Dict[str, Any]] = None,
    ) -> Tuple[WhatsAppMessage, Optional[WhatsAppMessage], List[DocumentSourceRef], float]:
        """Process incoming WhatsApp message, run RAG + LLM, and send reply."""
        start_time = time.time()
        bot_settings = get_whatsapp_settings()
        
        now_str = datetime.now(timezone.utc).isoformat()
        user_msg_id = str(uuid.uuid4())
        
        # 1. Save user incoming message
        user_message_dict = {
            "id": user_msg_id,
            "phone_number": phone_number,
            "sender": "user",
            "text": text,
            "timestamp": now_str,
            "rag_sources": [],
            "status": "received",
            "raw_payload": raw_payload,
        }
        save_whatsapp_message(user_message_dict, contact_name=contact_name)
        user_message = WhatsAppMessage(**user_message_dict)

        # Check if AI auto-reply is enabled
        ai_enabled = bot_settings.get("ai_enabled", True)
        if not ai_enabled:
            logger.info(f"WhatsApp AI auto-reply is disabled. Stored incoming message from {phone_number}")
            return user_message, None, [], time.time() - start_time

        # 2. Retrieve RAG context if enabled
        sources_used: List[DocumentSourceRef] = []
        context_chunks: List[str] = []
        should_use_rag = bot_settings.get("use_rag", True) if use_rag is None else use_rag
        
        if should_use_rag:
            try:
                top_k = bot_settings.get("rag_top_k", settings.RAG_TOP_K)
                rag_results = rag_service.search(query=text, top_k=top_k)
                for res in rag_results:
                    context_chunks.append(res["document"])
                    meta = res.get("metadata", {})
                    sources_used.append(
                        DocumentSourceRef(
                            doc_id=meta.get("doc_id", ""),
                            title=meta.get("title", "Knowledge Base Document"),
                            category=meta.get("category", "general"),
                            chunk_text=res["document"][:220],
                            score=round(1.0 - res.get("distance", 0.0), 3),
                        )
                    )
            except Exception as e:
                logger.warning(f"RAG search encountered an issue: {e}")

        # 3. Retrieve conversation history (up to last 6 messages)
        history_msgs = get_whatsapp_messages_by_phone(phone_number)
        # Exclude the current message we just added
        prior_thread = [m for m in history_msgs if m.get("id") != user_msg_id][-6:]

        # 4. Construct LLM Prompts
        system_instructions = bot_settings.get("system_prompt", settings.WHATSAPP_SYSTEM_PROMPT)
        
        system_content = f"""{system_instructions}

CORE GUIDELINES:
1. Language: Automatically detect and respond in the customer's language:
   - If they write in Roman Urdu (e.g., "Aap ke prices kya hain?"), respond in clear, natural Roman Urdu.
   - If they write in Urdu script (e.g., "آپ کی قیمتیں کیا ہیں؟"), respond in Urdu script.
   - If they write in English, respond in professional English.
2. Tone: Warm, respectful, polite Pakistani customer service tone (e.g. "Assalam-o-Alaikum", "Jee zaroor", "Shukriya").
3. WhatsApp Formatting: Keep responses concise and easy to read on mobile. Use bullet points (* text *) or bold words (*word*) where helpful.
4. Accuracy: Use the provided Knowledge Base context to answer business-specific queries truthfully. If specific information is not in the context, politely let the customer know that our team will assist them further.

KNOWLEDGE BASE CONTEXT:
{"---".join(context_chunks) if context_chunks else "No specific document context available. Rely on general business guidance."}
"""

        messages = [SystemMessage(content=system_content)]
        
        for m in prior_thread:
            if m.get("sender") == "user":
                messages.append(HumanMessage(content=m.get("text", "")))
            elif m.get("sender") == "agent":
                messages.append(AIMessage(content=m.get("text", "")))

        messages.append(HumanMessage(content=text))

        # 5. Generate AI response
        try:
            llm = self._get_llm()
            ai_res = await llm.ainvoke(messages)
            agent_reply_text = ai_res.content.strip()
        except Exception as e:
            logger.error(f"OpenAI generation failed for WhatsApp message: {e}")
            agent_reply_text = (
                "Assalam-o-Alaikum! Shukriya aap ke message ka. "
                "Hamaari team thori der mein aap se rabta karegi."
            )

        # 6. Save agent response
        agent_msg_id = str(uuid.uuid4())
        agent_timestamp = datetime.now(timezone.utc).isoformat()
        agent_message_dict = {
            "id": agent_msg_id,
            "phone_number": phone_number,
            "sender": "agent",
            "text": agent_reply_text,
            "timestamp": agent_timestamp,
            "rag_sources": [s.model_dump() for s in sources_used],
            "status": "sent",
        }
        save_whatsapp_message(agent_message_dict, contact_name=contact_name)
        agent_message = WhatsAppMessage(**agent_message_dict)

        # 7. Dispatch to Meta Cloud API if configured
        api_token = bot_settings.get("api_token") or settings.WHATSAPP_API_TOKEN
        phone_number_id = bot_settings.get("phone_number_id") or settings.WHATSAPP_PHONE_NUMBER_ID
        if api_token and phone_number_id:
            await self.send_meta_whatsapp_message(
                to_phone=phone_number,
                text=agent_reply_text,
                api_token=api_token,
                phone_number_id=phone_number_id,
            )

        execution_time = round(time.time() - start_time, 2)
        return user_message, agent_message, sources_used, execution_time

    async def send_meta_whatsapp_message(
        self,
        to_phone: str,
        text: str,
        api_token: Optional[str] = None,
        phone_number_id: Optional[str] = None,
    ) -> bool:
        """Send outgoing message via Meta WhatsApp Cloud API."""
        bot_settings = get_whatsapp_settings()
        token = api_token or bot_settings.get("api_token") or settings.WHATSAPP_API_TOKEN
        pid = phone_number_id or bot_settings.get("phone_number_id") or settings.WHATSAPP_PHONE_NUMBER_ID

        if not token or not pid:
            logger.info("Meta WhatsApp Cloud API credentials not fully configured — skipped direct Meta HTTP dispatch")
            return False

        url = f"https://graph.facebook.com/v19.0/{pid}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone.replace("+", "").strip(),
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }

        try:
            async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    logger.info(f"Successfully sent WhatsApp message to {to_phone} via Meta API")
                    return True
                else:
                    logger.error(f"Meta WhatsApp API returned error {res.status_code}: {res.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to send message via Meta WhatsApp API: {e}")
            return False


whatsapp_service = WhatsAppService()
