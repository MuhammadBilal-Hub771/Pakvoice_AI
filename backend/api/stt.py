from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from loguru import logger

from config import settings
from core.dependencies import get_current_user
from core.rate_limit import limiter
from models.stt import TranscribeResponse
from models.user import TokenPayload
from services.stt_service import stt_service

router = APIRouter(prefix="/api/stt", tags=["Speech-to-Text"])

ALLOWED_LANGUAGES = {"en", "ur", "roman-urdu"}


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Transcribe audio to text using OpenAI Whisper",
)
@limiter.limit(settings.RATE_LIMIT_STT)
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("en"),
    current_user: TokenPayload = Depends(get_current_user),
):
    """Transcribe uploaded audio (Urdu, Roman Urdu, or Pakistani English).

    The audio file is sent to OpenAI Whisper for transcription. Roman Urdu
    requests are first transcribed as Urdu and then transliterated to the
    Latin script.
    """
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="language must be one of: en, ur, roman-urdu",
        )

    data = await file.read()

    logger.info(
        f"STT request from {current_user.email}: language={language}, bytes={len(data)}"
    )

    try:
        return await stt_service.transcribe(
            file_bytes=data,
            filename=file.filename or "recording.webm",
            language=language,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Speech transcription failed",
        )
