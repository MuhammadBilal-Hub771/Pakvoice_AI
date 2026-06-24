import uuid
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from loguru import logger

from models.content import (
    GenerateRequest,
    GenerateResponse,
    RefineRequest,
    RefineResponse,
)
from core.dependencies import get_current_user
from models.user import TokenPayload
from services.ai_service import ai_service
from utils.formatters import get_labels, CONTENT_TYPE_LABELS, ContentType

router = APIRouter(prefix="/api/generate", tags=["Content Generation"])


@router.post(
    "/content",
    response_model=GenerateResponse,
    summary="Generate business content using AI",
)
async def generate_content(
    request: GenerateRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    logger.info(
        f"Content generation request from {current_user.email}: "
        f"{request.business_name} - {request.content_type.value}"
    )

    response = await ai_service.generate_content(
        request=request,
        user_id=current_user.sub,
    )

    return response


@router.post(
    "/content/stream",
    summary="Generate business content using AI (streaming — text appears as generated)",
)
async def generate_content_stream(
    request: GenerateRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    logger.info(
        f"Streaming content request from {current_user.email}: "
        f"{request.business_name} - {request.content_type.value}"
    )

    content_id = str(uuid.uuid4())

    return StreamingResponse(
        ai_service.generate_content_stream(
            request=request,
            user_id=current_user.sub,
            content_id=content_id,
        ),
        media_type="text/plain; charset=utf-8",
        headers={"X-Content-ID": content_id},
    )


@router.post(
    "/refine",
    response_model=RefineResponse,
    summary="Refine existing content",
)
async def refine_content(
    request: RefineRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    logger.info(
        f"Content refinement request from {current_user.email}: "
        f"{request.content_id}"
    )

    response = await ai_service.refine_content(
        request=request,
        user_id=current_user.sub,
    )

    return response


@router.get(
    "/content-types",
    response_model=list,
    summary="Get all available content types with labels",
)
async def get_content_types():
    return [
        {"value": ct.value, "label_en": ct.value.replace("_", " ").title(), "label_ur": CONTENT_TYPE_LABELS.get(ct, {}).get("ur", "")}
        for ct in ContentType
    ]


@router.get(
    "/metadata",
    summary="Get all metadata options (industries, cities, etc.)",
)
async def get_metadata():
    return get_labels()
