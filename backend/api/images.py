import os
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from loguru import logger

from core.dependencies import get_current_user
from db.json_store import (
    save_image_record,
    get_user_images,
    delete_image_record,
)
from models.image import (
    GenerateImageRequest,
    GenerateImageResponse,
    SaveImageRequest,
    SavedImage,
)
from models.user import TokenPayload
from services.image_service import image_service
from config import settings

router = APIRouter(prefix="/api/images", tags=["Image Generation"])


def _image_server_url(request: Request) -> str:
    """Build the base URL for serving image files from the request itself."""
    base = str(request.base_url).rstrip("/")
    return base


async def download_and_store_image(url: str, image_id: str, request: Request) -> str:
    """Download a remote image and store it permanently.

    Remote image URLs may expire, so we save a local copy.
    Returns an absolute URL pointing to the stored file.
    """
    storage_dir = settings.IMAGE_STORAGE_DIR
    os.makedirs(storage_dir, exist_ok=True)

    file_path = os.path.join(storage_dir, f"{image_id}.png")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()
            with open(file_path, "wb") as f:
                f.write(response.content)
        base = _image_server_url(request)
        return f"{base}/static/images/{image_id}.png"
    except Exception as e:
        logger.warning(f"Failed to download image {url}: {e}")
        # Fall back to the original URL (may expire)
        return url


def _to_absolute_url(path: str, request: Request) -> str:
    """Convert a relative path to an absolute URL using the request context."""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    base = _image_server_url(request)
    path = path.lstrip("/")
    return f"{base}/{path}"


@router.post(
    "/generate",
    response_model=GenerateImageResponse,
    summary="Generate an image from content using GPT Image 2",
)
async def generate_image(
    request: Request,
    body: GenerateImageRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Generate an image using GPT Image 2 (gpt-image-2) based on provided content.

    Falls back to SVG placeholder if the API is unavailable.
    """
    if not body.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content cannot be empty",
        )

    if len(body.content) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content too long (max 2000 characters)",
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

        # Convert relative paths to absolute URLs
        result["image_url"] = _to_absolute_url(result["image_url"], request)

        # Download and store remote images permanently
        if result["image_url"].startswith("http") and not result["image_url"].startswith(
            f"http://{request.url.hostname}"
        ):
            stored_url = await download_and_store_image(
                result["image_url"], result["image_id"], request
            )
            if stored_url != result["image_url"]:
                result["image_url"] = stored_url

        return GenerateImageResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
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
    """Save a generated image reference to the user's gallery.

    If the image URL points to a remote URL, it will be downloaded
    and stored permanently. Relative paths are converted to absolute URLs.
    """
    image_url = _to_absolute_url(body.image_url, request)
    image_id = str(uuid.uuid4())

    # Download remote images for permanent storage
    if image_url.startswith("http") and not image_url.startswith(
        f"http://{request.url.hostname}"
    ):
        stored_url = await download_and_store_image(image_url, image_id, request)
        if stored_url != image_url:
            image_url = stored_url

    image_record = {
        "id": image_id,
        "user_id": current_user.sub,
        "image_url": image_url,
        "image_type": body.image_type.value,
        "source_content": body.source_content[:500],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    save_image_record(image_record)

    logger.info(f"Image saved to gallery by {current_user.email}: {image_id}")
    return {
        "status": "saved",
        "image_id": image_id,
        "image_url": image_url,
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
    """Get all saved images for the current user with optional filtering."""
    images = get_user_images(
        user_id=current_user.sub,
        image_type=image_type,
        search=search,
    )
    # Ensure all stored image URLs are absolute
    for img in images:
        img["image_url"] = _to_absolute_url(img["image_url"], request)
    return {"items": images, "total": len(images)}


@router.delete(
    "/{image_id}",
    summary="Delete a saved image",
)
async def delete_image(
    image_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Delete an image from the user's gallery and remove the file."""
    success = delete_image_record(image_id=image_id, user_id=current_user.sub)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    # Try to delete the stored file too
    storage_dir = settings.IMAGE_STORAGE_DIR
    for ext in (".png", ".svg"):
        filepath = os.path.join(storage_dir, f"{image_id}{ext}")
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"Deleted image file: {filepath}")
        except OSError:
            logger.warning(f"Could not delete image file: {filepath}")

    logger.info(f"Image deleted by {current_user.email}: {image_id}")
    return {"status": "deleted", "message": "Image deleted successfully"}
