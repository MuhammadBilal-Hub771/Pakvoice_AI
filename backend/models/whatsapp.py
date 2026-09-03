from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal


class DocumentSourceRef(BaseModel):
    doc_id: str = ""
    title: str = ""
    category: str = "general"
    chunk_text: str = ""
    score: float = 0.0


class WhatsAppMessage(BaseModel):
    id: str
    phone_number: str
    sender: Literal["user", "agent", "system"]
    text: str
    timestamp: str
    rag_sources: List[DocumentSourceRef] = []
    status: Literal["sent", "delivered", "read", "received", "failed"] = "sent"
    raw_payload: Optional[Dict[str, Any]] = None


class WhatsAppConversation(BaseModel):
    phone_number: str
    contact_name: Optional[str] = None
    last_message: str = ""
    last_timestamp: str = ""
    unread_count: int = 0
    message_count: int = 0
    last_sender: Literal["user", "agent", "system"] = "user"


class WhatsAppSendRequest(BaseModel):
    phone_number: str
    text: str


class WhatsAppSimulateRequest(BaseModel):
    phone_number: str = "+923001234567"
    contact_name: Optional[str] = "Customer"
    text: str
    use_rag: bool = True


class WhatsAppSimulateResponse(BaseModel):
    user_message: WhatsAppMessage
    agent_message: Optional[WhatsAppMessage] = None
    sources_used: List[DocumentSourceRef] = []
    detected_language: Optional[str] = "English / Roman Urdu"
    execution_time_seconds: float = 0.0


class WhatsAppSettings(BaseModel):
    verify_token: str = "pakvoice_whatsapp_verify_secret"
    api_token: Optional[str] = ""
    phone_number_id: Optional[str] = ""
    business_account_id: Optional[str] = ""
    ai_enabled: bool = True
    system_prompt: str = (
        "You are the intelligent WhatsApp AI customer support and sales assistant for our business in Pakistan. "
        "Your tone is polite, professional, and helpful. "
        "You understand and respond naturally in the user's preferred language (English, Urdu اردو, or Roman Urdu). "
        "When business documents are provided as context, ground your answers strictly in the knowledge base facts. "
        "If you do not know the answer, politely ask them to leave their query so a team member can assist them."
    )
    use_rag: bool = True
    rag_top_k: int = 3
