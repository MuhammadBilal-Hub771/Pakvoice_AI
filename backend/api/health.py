from datetime import datetime, timezone

from fastapi import APIRouter
from loguru import logger

from config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("/", summary="Health check endpoint")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready", summary="Readiness check")
async def readiness_check():
    try:
        from db.chroma import get_or_create_collection

        collection = get_or_create_collection()
        doc_count = collection.count()

        return {
            "status": "ready",
            "chroma_db": "connected",
            "documents_in_kb": doc_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "status": "not_ready",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
