import asyncio
import os
from io import BytesIO

from fastapi import HTTPException
from loguru import logger
from openai import OpenAI

from config import settings
from models.stt import TranscribeResponse

ALLOWED_LANGUAGES = {"en", "ur", "roman-urdu"}

_MIME_TYPES = {
    ".webm": "audio/webm",
    ".mp3": "audio/mpeg",
    ".mpeg": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".ogg": "audio/ogg",
}

ROMAN_URDU_SYSTEM_PROMPT = (
    "You are a transliteration assistant. Convert the given Urdu text "
    "(written in the Nastaliq/Arabic script) into Roman Urdu using the "
    "Latin alphabet and standard Pakistani romanization conventions. "
    "Preserve the original meaning exactly. Do not translate, summarize, "
    "or add any commentary. Return ONLY the transliterated Roman Urdu text."
)


class SpeechToTextService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def _mime_type(self, filename: str) -> str:
        ext = os.path.splitext(filename or "")[1].lower()
        return _MIME_TYPES.get(ext, "audio/webm")

    def _whisper_language(self, language: str) -> str:
        return "ur" if language in ("ur", "roman-urdu") else "en"

    async def transcribe(
        self,
        file_bytes: bytes,
        filename: str,
        language: str,
    ) -> TranscribeResponse:
        if language not in ALLOWED_LANGUAGES:
            raise HTTPException(
                status_code=422,
                detail="language must be one of: en, ur, roman-urdu",
            )

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty",
            )

        max_bytes = settings.WHISPER_MAX_FILE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"Audio file too large. Maximum allowed size is "
                    f"{settings.WHISPER_MAX_FILE_MB} MB."
                ),
            )

        whisper_lang = self._whisper_language(language)
        mime = self._mime_type(filename)

        def _call_whisper():
            return self.client.audio.transcriptions.create(
                model=settings.WHISPER_MODEL,
                file=(filename or "recording.webm", BytesIO(file_bytes), mime),
                language=whisper_lang,
                response_format="json",
            )

        try:
            resp = await asyncio.to_thread(_call_whisper)
        except Exception as e:
            self._handle_openai_error(e)

        text = resp.text or ""

        if language == "roman-urdu" and text.strip():
            text = await self._transliterate_to_roman_urdu(text)

        return TranscribeResponse(
            text=text,
            language=language,
            duration=float(getattr(resp, "duration", 0.0) or 0.0),
            model=settings.WHISPER_MODEL,
        )

    async def _transliterate_to_roman_urdu(self, text: str) -> str:
        def _call():
            resp = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": ROMAN_URDU_SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                temperature=0.2,
            )
            return (resp.choices[0].message.content or text).strip()

        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(_call),
                timeout=30.0,
            )
            return result or text
        except asyncio.TimeoutError:
            logger.warning("Roman Urdu transliteration timed out — returning Urdu script")
            return text
        except HTTPException:
            raise
        except Exception as e:
            self._handle_openai_error(e)

    def _handle_openai_error(self, error: Exception):
        error_msg = str(error).lower()

        if (
            "authentication" in error_msg
            or "api key" in error_msg
            or "invalid_api_key" in error_msg
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid OpenAI API key. Please check your configuration.",
            )
        elif "rate limit" in error_msg or "rate_limit" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="OpenAI rate limit reached. Please try again in a moment.",
            )
        elif "quota" in error_msg or "insufficient_quota" in error_msg:
            raise HTTPException(
                status_code=402,
                detail="OpenAI quota exceeded. Please check your billing.",
            )
        elif "connection" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Cannot connect to OpenAI. Please check your internet connection.",
            )
        elif "timeout" in error_msg:
            raise HTTPException(
                status_code=504,
                detail="OpenAI request timed out. Please try again.",
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI error: {str(error)}",
            )


stt_service = SpeechToTextService()
