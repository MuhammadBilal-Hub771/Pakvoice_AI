"""Conversation logic for the WhatsApp bot.

The whole product is reachable from WhatsApp: generate content (typed or
spoken), refine it, turn it into an image, browse history, add knowledge base
documents, and change defaults.

State lives in the ``whatsapp_sessions`` table rather than memory, so a restart
or a second app instance does not drop a half-finished conversation.

Everything here runs after the webhook has already answered 200, so failures
are reported to the user over WhatsApp and logged, never raised.
"""

import os
import time
from collections import defaultdict, deque
from typing import Any, Deque, Dict, List, Optional, Tuple

from loguru import logger

from config import settings
from db.json_store import (
    consume_whatsapp_link_code,
    get_user_by_id,
    get_user_by_whatsapp_phone,
    get_user_documents,
    get_user_history,
    get_whatsapp_session,
    set_user_whatsapp_phone,
    upsert_whatsapp_session,
)
from models.content import (
    City,
    ContentLength,
    ContentType,
    GenerateRequest,
    Industry,
    Language,
    RefineRequest,
    Tone,
)
from models.whatsapp import ConversationState, WhatsAppMessage
from services import whatsapp_client as wa
from services.ai_service import ai_service
from services.document_service import document_service
from services.image_service import image_service
from services.stt_service import stt_service

# Per-phone sliding window. In-memory, so it is per-process: with several app
# instances a determined user gets the limit times the instance count. Good
# enough as an abuse brake; the real cost ceiling is the OpenAI account.
_recent_messages: Dict[str, Deque[float]] = defaultdict(deque)

_WHISPER_LANGUAGE = {
    Language.ENGLISH.value: "en",
    Language.URDU.value: "ur",
    Language.ROMAN_URDU.value: "roman-urdu",
}

_MENU_ROWS = [
    {"id": "gen_content", "title": "Write content", "description": "Post, blog, email, ad copy"},
    {"id": "gen_image", "title": "Create an image", "description": "Poster or thumbnail"},
    {"id": "history", "title": "Recent content", "description": "Your last generations"},
    {"id": "kb", "title": "Knowledge base", "description": "Send a PDF or DOCX to add"},
    {"id": "settings", "title": "Settings", "description": "Language, tone, content type"},
]

_CONTENT_TYPE_ROWS = [
    {"id": f"set_type_{ct.value}", "title": ct.value.replace("_", " ").title()}
    for ct in ContentType
]

_LANGUAGE_ROWS = [
    {"id": f"set_lang_{Language.ENGLISH.value}", "title": "English"},
    {"id": f"set_lang_{Language.URDU.value}", "title": "Urdu"},
    {"id": f"set_lang_{Language.ROMAN_URDU.value}", "title": "Roman Urdu"},
]

_TONE_ROWS = [
    {"id": f"set_tone_{t.value}", "title": t.value.title()} for t in Tone
]


def _coerce_enum(enum_cls, value: Optional[str], default):
    """Best-effort map a free-text profile value onto an enum member."""
    if not value:
        return default
    normalized = str(value).strip().lower().replace(" ", "_").replace("-", "_")
    for member in enum_cls:
        if member.value == normalized:
            return member
    for member in enum_cls:
        if normalized in member.value or member.value in normalized:
            return member
    return default


def _throttled(phone: str) -> bool:
    window = _recent_messages[phone]
    now = time.time()
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= settings.WHATSAPP_MAX_MESSAGES_PER_MINUTE:
        return True
    window.append(now)
    return False


class WhatsAppBot:
    # === Session helpers ===

    def _load_session(self, phone: str) -> Dict[str, Any]:
        session = get_whatsapp_session(phone)
        if session:
            return session
        return {
            "phone": phone,
            "user_id": None,
            "state": ConversationState.NEW.value,
            "context": {},
        }

    def _save(
        self,
        phone: str,
        user_id: Optional[str],
        state: ConversationState,
        context: Dict[str, Any],
    ) -> None:
        upsert_whatsapp_session(
            phone=phone,
            user_id=user_id,
            state=state.value,
            context=context,
        )

    # === Entry point ===

    async def handle_message(self, message: WhatsAppMessage) -> None:
        phone = message.from_
        if not phone:
            logger.warning("WhatsApp message without a sender — ignoring")
            return

        if _throttled(phone):
            logger.warning(f"Throttling WhatsApp sender {phone}")
            await wa.send_text(
                phone, "You are sending messages very quickly. Please wait a moment."
            )
            return

        if message.id:
            await wa.mark_read(message.id)

        try:
            session = self._load_session(phone)
            user = get_user_by_whatsapp_phone(phone)

            if user is None:
                await self._handle_unlinked(phone, session, message)
                return

            if not user.is_active:
                await wa.send_text(
                    phone,
                    "Your PakVoice AI account is disabled. Please contact support.",
                )
                return

            await self._handle_linked(phone, user, session, message)

        except Exception as e:
            logger.exception(f"WhatsApp bot failed for {phone}: {e}")
            await wa.send_text(
                phone,
                "Something went wrong on our side. Please try again in a moment.",
            )

    # === Account linking ===

    async def _handle_unlinked(
        self, phone: str, session: Dict[str, Any], message: WhatsAppMessage
    ) -> None:
        text = message.body_text

        code = "".join(ch for ch in text if ch.isdigit())
        if len(code) == 6:
            user_id = consume_whatsapp_link_code(code)
            if user_id:
                if not set_user_whatsapp_phone(user_id, phone):
                    await wa.send_text(
                        phone,
                        "This number is already connected to another PakVoice AI "
                        "account. Disconnect it there first.",
                    )
                    return
                user = get_user_by_id(user_id)
                self._save(phone, user_id, ConversationState.MENU, {})
                await wa.send_text(
                    phone,
                    f"Connected. Welcome, {user.name if user else 'there'}.",
                )
                await self._send_menu(phone)
                return

            await wa.send_text(
                phone,
                "That code is not valid or has expired. Generate a new one from "
                "your profile page and send it here.",
            )
            return

        self._save(phone, None, ConversationState.AWAITING_LINK_CODE, {})
        await wa.send_text(
            phone,
            "Welcome to PakVoice AI.\n\n"
            "To connect this number, open your profile on "
            f"{settings.FRONTEND_URL}/client/profile, tap Connect WhatsApp, and "
            "send me the 6-digit code.",
        )

    # === Linked user dispatch ===

    async def _handle_linked(
        self,
        phone: str,
        user,
        session: Dict[str, Any],
        message: WhatsAppMessage,
    ) -> None:
        context: Dict[str, Any] = dict(session.get("context") or {})
        state = session.get("state") or ConversationState.MENU.value
        user_id = user.id

        # Interactive taps always win over whatever state we were in, so a user
        # can jump straight to another action mid-flow.
        action = message.interactive.selected_id() if message.interactive else None
        if action:
            await self._handle_action(phone, user, action, context)
            return

        if message.type == "document":
            await self._handle_document(phone, user, message, context)
            return

        text = await self._resolve_text(phone, message, context)
        if text is None:
            return

        lowered = text.lower().strip()
        if lowered in ("menu", "hi", "hello", "start", "help", "salam", "assalam"):
            self._save(phone, user_id, ConversationState.MENU, context)
            await self._send_menu(phone)
            return

        if state == ConversationState.AWAITING_CONTENT_BRIEF.value:
            await self._generate_content(phone, user, text, context)
        elif state == ConversationState.AWAITING_REFINE_INSTRUCTION.value:
            await self._refine_content(phone, user, text, context)
        elif state == ConversationState.AWAITING_IMAGE_BRIEF.value:
            await self._generate_image(phone, user, text, context)
        else:
            # Anything else typed at the menu is treated as a content brief,
            # which is what people actually do.
            await self._generate_content(phone, user, text, context)

    async def _resolve_text(
        self, phone: str, message: WhatsAppMessage, context: Dict[str, Any]
    ) -> Optional[str]:
        """Return the user's text, transcribing a voice note if needed."""
        if message.body_text:
            return message.body_text

        audio = message.audio_media
        if audio and audio.id:
            await wa.send_text(phone, "Listening to your voice note...")
            media = await wa.download_media(audio.id)
            if media is None:
                await wa.send_text(
                    phone, "I could not download that voice note. Please try again."
                )
                return None

            content, _mime, filename = media
            language = context.get("language", Language.ENGLISH.value)
            try:
                result = await stt_service.transcribe(
                    file_bytes=content,
                    filename=filename,
                    language=_WHISPER_LANGUAGE.get(language, "en"),
                )
            except Exception as e:
                logger.error(f"WhatsApp transcription failed: {e}")
                await wa.send_text(
                    phone, "I could not understand that audio. Please try again."
                )
                return None

            if not result.text.strip():
                await wa.send_text(
                    phone, "That voice note sounded empty. Please try again."
                )
                return None

            await wa.send_text(phone, f'I heard: "{result.text.strip()}"')
            return result.text.strip()

        await wa.send_text(
            phone,
            "Send me text or a voice note, or type *menu* to see what I can do.",
        )
        return None

    # === Actions ===

    async def _handle_action(
        self, phone: str, user, action: str, context: Dict[str, Any]
    ) -> None:
        user_id = user.id

        if action == "menu":
            self._save(phone, user_id, ConversationState.MENU, context)
            await self._send_menu(phone)

        elif action == "gen_content":
            self._save(phone, user_id, ConversationState.AWAITING_CONTENT_BRIEF, context)
            content_type = context.get("content_type", ContentType.SOCIAL_MEDIA.value)
            await wa.send_text(
                phone,
                f"What should I write about? Current type is "
                f"*{content_type.replace('_', ' ')}*.\n\n"
                "Send text or a voice note. Example: "
                '"new winter collection at our Lahore shop, 20 percent off".',
            )

        elif action == "gen_image":
            self._save(phone, user_id, ConversationState.AWAITING_IMAGE_BRIEF, context)
            hint = (
                "Send the text for the image, or reply *last* to use your most "
                "recent content."
            )
            await wa.send_text(phone, f"What should the image show?\n\n{hint}")

        elif action == "history":
            await self._send_history(phone, user, context)

        elif action == "kb":
            await self._send_kb_summary(phone, user, context)

        elif action == "settings":
            await self._send_settings(phone, context)

        elif action == "refine":
            if not context.get("last_content"):
                await wa.send_text(phone, "There is nothing to refine yet.")
                await self._send_menu(phone)
                return
            self._save(
                phone, user_id, ConversationState.AWAITING_REFINE_INSTRUCTION, context
            )
            await wa.send_text(
                phone,
                "How should I change it? For example: make it shorter, more "
                "formal, or add a call to action.",
            )

        elif action == "make_image":
            if not context.get("last_content"):
                await wa.send_text(phone, "Generate some content first.")
                await self._send_menu(phone)
                return
            await self._generate_image(phone, user, context["last_content"], context)

        elif action == "set_language":
            await wa.send_list(
                phone,
                body="Which language should I write in?",
                button_text="Choose",
                rows=_LANGUAGE_ROWS,
                header="Language",
            )

        elif action == "set_type":
            await wa.send_list(
                phone,
                body="Which type of content do you want by default?",
                button_text="Choose",
                rows=_CONTENT_TYPE_ROWS,
                header="Content type",
            )

        elif action == "set_tone":
            await wa.send_list(
                phone,
                body="Which tone should I use?",
                button_text="Choose",
                rows=_TONE_ROWS,
                header="Tone",
            )

        elif action.startswith("set_lang_"):
            context["language"] = action[len("set_lang_") :]
            self._save(phone, user_id, ConversationState.MENU, context)
            await wa.send_text(
                phone, f"Language set to {context['language'].replace('_', ' ')}."
            )
            await self._send_menu(phone)

        elif action.startswith("set_type_"):
            context["content_type"] = action[len("set_type_") :]
            self._save(phone, user_id, ConversationState.MENU, context)
            await wa.send_text(
                phone,
                f"Default content type set to "
                f"{context['content_type'].replace('_', ' ')}.",
            )
            await self._send_menu(phone)

        elif action.startswith("set_tone_"):
            context["tone"] = action[len("set_tone_") :]
            self._save(phone, user_id, ConversationState.MENU, context)
            await wa.send_text(phone, f"Tone set to {context['tone']}.")
            await self._send_menu(phone)

        else:
            logger.warning(f"Unknown WhatsApp action: {action}")
            await self._send_menu(phone)

    async def _send_menu(self, phone: str) -> None:
        await wa.send_list(
            phone,
            body="What would you like to do?",
            button_text="Open menu",
            rows=_MENU_ROWS,
            header="PakVoice AI",
            footer="Type menu any time",
        )

    async def _send_settings(self, phone: str, context: Dict[str, Any]) -> None:
        language = context.get("language", Language.ENGLISH.value)
        content_type = context.get("content_type", ContentType.SOCIAL_MEDIA.value)
        tone = context.get("tone", Tone.PROFESSIONAL.value)
        await wa.send_buttons(
            phone,
            body=(
                "Current defaults:\n"
                f"Language: {language.replace('_', ' ')}\n"
                f"Content type: {content_type.replace('_', ' ')}\n"
                f"Tone: {tone}"
            ),
            buttons=[
                {"id": "set_language", "title": "Language"},
                {"id": "set_type", "title": "Content type"},
                {"id": "set_tone", "title": "Tone"},
            ],
            header="Settings",
        )

    # === Content generation ===

    def _build_request(
        self, user, brief: str, context: Dict[str, Any]
    ) -> GenerateRequest:
        return GenerateRequest(
            business_name=context.get("business_name") or user.name,
            business_description=brief,
            content_type=_coerce_enum(
                ContentType,
                context.get("content_type"),
                ContentType.SOCIAL_MEDIA,
            ),
            industry=_coerce_enum(Industry, user.industry, Industry.ECOMMERCE),
            city=_coerce_enum(City, user.city, City.KARACHI),
            language=_coerce_enum(Language, context.get("language"), Language.ENGLISH),
            tone=_coerce_enum(Tone, context.get("tone"), Tone.PROFESSIONAL),
            # WhatsApp is a short-form surface; long articles do not belong here.
            content_length=ContentLength.SHORT,
            key_message=brief[:500],
            use_knowledge_base=True,
        )

    async def _generate_content(
        self, phone: str, user, brief: str, context: Dict[str, Any]
    ) -> None:
        await wa.send_text(phone, "Writing your content...")

        try:
            request = self._build_request(user, brief, context)
            response = await ai_service.generate_content(
                request=request,
                user_id=user.id,
                source_channel="whatsapp",
            )
        except Exception as e:
            logger.error(f"WhatsApp generation failed for {phone}: {e}")
            await wa.send_text(
                phone,
                "I could not generate that right now. Please try again shortly.",
            )
            return

        context["last_content"] = response.generated_content
        context["last_content_id"] = response.content_id
        context["last_brief"] = brief
        self._save(phone, user.id, ConversationState.MENU, context)

        await wa.send_text(phone, response.generated_content)
        await wa.send_buttons(
            phone,
            body="What next?",
            buttons=[
                {"id": "refine", "title": "Refine"},
                {"id": "make_image", "title": "Make image"},
                {"id": "menu", "title": "Menu"},
            ],
        )

    async def _refine_content(
        self, phone: str, user, instruction: str, context: Dict[str, Any]
    ) -> None:
        original = context.get("last_content")
        if not original:
            await wa.send_text(phone, "There is nothing to refine yet.")
            await self._send_menu(phone)
            return

        await wa.send_text(phone, "Refining...")

        try:
            response = await ai_service.refine_content(
                request=RefineRequest(
                    content_id=context.get("last_content_id", ""),
                    original_content=original,
                    refinement_instruction=instruction,
                ),
                user_id=user.id,
            )
        except Exception as e:
            logger.error(f"WhatsApp refine failed for {phone}: {e}")
            await wa.send_text(phone, "I could not refine that. Please try again.")
            return

        context["last_content"] = response.refined_content
        self._save(phone, user.id, ConversationState.MENU, context)

        await wa.send_text(phone, response.refined_content)
        await wa.send_buttons(
            phone,
            body="What next?",
            buttons=[
                {"id": "refine", "title": "Refine again"},
                {"id": "make_image", "title": "Make image"},
                {"id": "menu", "title": "Menu"},
            ],
        )

    async def _generate_image(
        self, phone: str, user, brief: str, context: Dict[str, Any]
    ) -> None:
        if brief.strip().lower() == "last":
            brief = context.get("last_content") or ""
            if not brief:
                await wa.send_text(phone, "There is no recent content to use.")
                await self._send_menu(phone)
                return

        await wa.send_text(phone, "Creating your image, this takes a moment...")

        try:
            result = await image_service.generate_image(
                content=brief[:2000],
                image_type="social_media",
            )
        except Exception as e:
            logger.error(f"WhatsApp image generation failed for {phone}: {e}")
            await wa.send_text(phone, "I could not create that image. Please try again.")
            return

        image_url = result.get("image_url", "")
        self._save(phone, user.id, ConversationState.MENU, context)

        # Prefer uploading bytes to Meta. Local ``/static/images/...`` paths are
        # not reachable from Meta's servers, and ngrok free tiers often block
        # their image fetch with an interstitial page.
        sent = False
        if image_url.startswith("/static/images/"):
            filename = image_url.rsplit("/", 1)[-1]
            local_path = os.path.join(settings.IMAGE_STORAGE_DIR, filename)
            if os.path.isfile(local_path):
                with open(local_path, "rb") as fh:
                    raw = fh.read()
                media_id = await wa.upload_media(raw, "image/png", filename)
                if media_id:
                    sent = await wa.send_image_id(
                        phone, media_id, caption="Your PakVoice image"
                    )
            else:
                logger.warning(f"WhatsApp image file missing on disk: {local_path}")
        elif image_url.startswith("https://"):
            sent = await wa.send_image(phone, image_url, caption="Your PakVoice image")
            if not sent:
                logger.warning(f"WhatsApp rejected image URL: {image_url}")

        if sent:
            await self._send_menu(phone)
            return

        await wa.send_text(
            phone,
            "Your image is ready, but I cannot send it over WhatsApp yet. "
            "Open the image gallery in the app to view and download it.",
        )
        await self._send_menu(phone)

    # === History and knowledge base ===

    async def _send_history(self, phone: str, user, context: Dict[str, Any]) -> None:
        items, total = get_user_history(user.id, page=1, page_size=5)
        if not items:
            await wa.send_text(
                phone, "You have not generated anything yet. Try *Write content*."
            )
            await self._send_menu(phone)
            return

        lines = [f"Your last {len(items)} of {total} generations:", ""]
        for i, item in enumerate(items, start=1):
            preview = item.generated_content.replace("\n", " ")[:120]
            lines.append(
                f"{i}. {item.content_type.replace('_', ' ').title()} "
                f"({item.created_at:%d %b})\n{preview}..."
            )
            lines.append("")

        await wa.send_text(phone, "\n".join(lines))
        await self._send_menu(phone)

    async def _send_kb_summary(self, phone: str, user, context: Dict[str, Any]) -> None:
        docs = get_user_documents(user.id)
        allowed = ", ".join(settings.allowed_extensions_list)

        if docs:
            titles = "\n".join(f"- {d.get('title') or d.get('filename')}" for d in docs[:10])
            body = (
                f"You have {len(docs)} document(s) in your knowledge base:\n\n"
                f"{titles}\n\nSend me a file ({allowed}) to add another."
            )
        else:
            body = (
                "Your knowledge base is empty. Send me a file "
                f"({allowed}) and I will use it as context when writing."
            )

        await wa.send_text(phone, body)
        await self._send_menu(phone)

    async def _handle_document(
        self,
        phone: str,
        user,
        message: WhatsAppMessage,
        context: Dict[str, Any],
    ) -> None:
        document = message.document
        if not document or not document.id:
            await wa.send_text(phone, "I could not read that file.")
            return

        await wa.send_text(phone, "Adding that to your knowledge base...")

        media = await wa.download_media(document.id)
        if media is None:
            await wa.send_text(phone, "I could not download that file. Please retry.")
            return

        content, _mime, filename = media
        filename = document.filename or filename

        try:
            result = await document_service.process_upload_bytes(
                file_bytes=content,
                filename=filename,
                title=filename.rsplit(".", 1)[0][:100],
                category="whatsapp",
                tags="whatsapp",
                user_id=user.id,
            )
        except Exception as e:
            logger.error(f"WhatsApp document upload failed for {phone}: {e}")
            detail = getattr(e, "detail", None)
            await wa.send_text(
                phone,
                str(detail)
                if detail
                else "I could not process that file. Supported types: "
                + ", ".join(settings.allowed_extensions_list),
            )
            return

        await wa.send_text(
            phone,
            f'Added "{result.title}" with {result.chunks_created} sections. '
            "I will use it as context from now on.",
        )
        await self._send_menu(phone)


whatsapp_bot = WhatsAppBot()
