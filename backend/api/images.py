import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from loguru import logger

from config import settings
from core.dependencies import get_current_user
from core.rate_limit import limiter
from db.json_store import (
    delete_image_record,
    get_image_by_id,
    get_user_images,
    save_image_record,
)
from models.image import (
    GenerateImageRequest,
    GenerateImageResponse,
    SaveImageRequest,
)
from models.user import TokenPayload
from services import storage_service
from services.image_service import image_service

router = APIRouter(prefix="/api/images", tags=["Image Generation"])


def _to_absolute_url(url: str, request: Request) -> str:
    """Make a stored image reference loadable by the browser.

    Supabase signed URLs are already absolute and are returned untouched.
    Local files are stored as ``/static/images/...`` and need the request's
    origin prefixed. The ``/generated_images/`` rewrite covers records written
    before the static mount was renamed.
    """
    if not url:
        return ""
    url = url.replace("/generated_images/", "/static/images/")
    if url.startswith("http://") or url.startswith("https://"):
        return url
    base = str(request.base_url).rstrip("/")
    return f"{base}/{url.lstrip('/')}"


@router.post(
    "/generate",
    response_model=GenerateImageResponse,
    summary="Generate an image from content using GPT Image 2",
)
@limiter.limit(settings.RATE_LIMIT_IMAGE)
async def generate_image(
    request: Request,
    body: GenerateImageRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Generate an image with GPT Image 2, falling back to an SVG placeholder.

    The image bytes are persisted before responding, so the returned URL does
    not depend on OpenAI's short-lived links.
    """
    if not body.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content cannot be empty",
        )

    logger.info(
        f"Image generation request from {current_user.email}: "
        f"type={body.image_type.value}, content_length={len(body.content)}"
    )

    try:
        result = await image_service.generate_image(
            content=body.content,
            image_type=body.image_type.value,
        )
        result["image_url"] = _to_absolute_url(result["image_url"], request)
        return GenerateImageResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image generation failed",
        )


@router.post(
    "/save",
    summary="Save a generated image to gallery",
)
async def save_image(
    request: Request,
    body: SaveImageRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Add a generated image to the user's gallery.

    Generation already stored the file, so this records a reference rather than
    copying bytes around.
    """
    image_id = body.image_id or str(uuid.uuid4())

    save_image_record(
        {
            "id": image_id,
            "user_id": current_user.sub,
            "image_url": body.image_url,
            "image_type": body.image_type.value,
            "source_content": body.source_content[:500],
            "storage_path": body.storage_path,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    logger.info(f"Image saved to gallery by {current_user.email}: {image_id}")
    return {
        "status": "saved",
        "image_id": image_id,
        "image_url": _to_absolute_url(body.image_url, request),
    }


@router.get(
    "/gallery",
    summary="List saved images for the current user",
)
async def list_gallery(
    request: Request,
    image_type: str = Query(None, alias="type"),
    search: str = Query(None),
    current_user: TokenPayload = Depends(get_current_user),
):
    images = get_user_images(
        user_id=current_user.sub,
        image_type=image_type,
        search=search,
    )
    for img in images:
        # Signed URLs expire, so re-sign on every listing rather than trusting
        # the URL captured when the image was saved.
        img["image_url"] = _to_absolute_url(
            storage_service.refresh_image_url(img), request
        )
    return {"items": images, "total": len(images)}


@router.delete(
    "/{image_id}",
    summary="Delete a saved image",
)
async def delete_image(
    image_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    record = get_image_by_id(image_id, current_user.sub)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    if not delete_image_record(image_id=image_id, user_id=current_user.sub):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    storage_service.delete_image(record)

    logger.info(f"Image deleted by {current_user.email}: {image_id}")
    return {"status": "deleted", "message": "Image deleted successfully"}
