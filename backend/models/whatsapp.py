"""Models for the WhatsApp Cloud API webhook.

Meta adds fields to webhook payloads without notice, so every model here
ignores unknown keys and treats almost everything as optional. A payload we
cannot fully parse should still be acknowledged rather than rejected — Meta
retries anything that is not answered with a 200 for up to seven days.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class ConversationState(str, Enum):
    """Where a phone number is in the conversation."""

    NEW = "new"
    AWAITING_LINK_CODE = "awaiting_link_code"
    MENU = "menu"
    AWAITING_CONTENT_BRIEF = "awaiting_content_brief"
    AWAITING_REFINE_INSTRUCTION = "awaiting_refine_instruction"
    AWAITING_IMAGE_BRIEF = "awaiting_image_brief"
    AWAITING_SETTING_VALUE = "awaiting_setting_value"


class _Lenient(BaseModel):
    model_config = ConfigDict(extra="ignore")


class WhatsAppTextBody(_Lenient):
    body: Optional[str] = None


class WhatsAppMediaBody(_Lenient):
    id: Optional[str] = None
    mime_type: Optional[str] = None
    sha256: Optional[str] = None
    filename: Optional[str] = None
    voice: Optional[bool] = None


class WhatsAppButtonReply(_Lenient):
    id: Optional[str] = None
    title: Optional[str] = None


class WhatsAppInteractive(_Lenient):
    type: Optional[str] = None
    button_reply: Optional[WhatsAppButtonReply] = None
    list_reply: Optional[WhatsAppButtonReply] = None

    def selected_id(self) -> Optional[str]:
        if self.button_reply and self.button_reply.id:
            return self.button_reply.id
        if self.list_reply and self.list_reply.id:
            return self.list_reply.id
        return None


class WhatsAppMessage(_Lenient):
    id: Optional[str] = None
    # Sender's phone number in international format without a leading '+'
    from_: Optional[str] = None
    timestamp: Optional[str] = None
    type: Optional[str] = None
    text: Optional[WhatsAppTextBody] = None
    audio: Optional[WhatsAppMediaBody] = None
    voice: Optional[WhatsAppMediaBody] = None
    document: Optional[WhatsAppMediaBody] = None
    image: Optional[WhatsAppMediaBody] = None
    interactive: Optional[WhatsAppInteractive] = None

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    def __init__(self, **data: Any):
        # 'from' is a Python keyword, so it cannot be a field name.
        if "from" in data:
            data["from_"] = data.pop("from")
        super().__init__(**data)

    @property
    def body_text(self) -> str:
        if self.text and self.text.body:
            return self.text.body.strip()
        return ""

    @property
    def audio_media(self) -> Optional[WhatsAppMediaBody]:
        return self.audio or self.voice


class WhatsAppValue(_Lenient):
    messaging_product: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    contacts: Optional[List[Dict[str, Any]]] = None
    messages: Optional[List[WhatsAppMessage]] = None
    statuses: Optional[List[Dict[str, Any]]] = None
    errors: Optional[List[Dict[str, Any]]] = None


class WhatsAppChange(_Lenient):
    field: Optional[str] = None
    value: Optional[WhatsAppValue] = None


class WhatsAppEntry(_Lenient):
    id: Optional[str] = None
    changes: Optional[List[WhatsAppChange]] = None


class WhatsAppWebhookPayload(_Lenient):
    object: Optional[str] = None
    entry: Optional[List[WhatsAppEntry]] = None

    def incoming_messages(self) -> List[WhatsAppMessage]:
        """Flatten the nested envelope down to the messages we care about.

        Status callbacks (sent/delivered/read) arrive in the same shape but
        carry a ``statuses`` array instead, and are ignored.
        """
        messages: List[WhatsAppMessage] = []
        for entry in self.entry or []:
            for change in entry.changes or []:
                if change.field and change.field != "messages":
                    continue
                if change.value and change.value.messages:
                    messages.extend(change.value.messages)
        return messages
