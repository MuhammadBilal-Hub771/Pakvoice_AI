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
    """Report on each dependency the app needs to serve traffic."""
    checks: dict = {}
    ready = True

    if settings.use_postgres:
        from db.session import check_connection

        connected = check_connection()
        checks["database"] = {
            "backend": "supabase_postgres",
            "connected": connected,
        }
        ready = ready and connected
    else:
        checks["database"] = {"backend": "json_files", "connected": True}

    try:
        from services.rag_service import rag_service

        checks["vector_store"] = {
            "backend": "pgvector" if settings.use_postgres else "chromadb",
            "connected": True,
            "chunks": rag_service.get_document_count(),
        }
    except Exception as e:
        logger.error(f"Vector store readiness check failed: {e}")
        checks["vector_store"] = {"connected": False, "error": str(e)}
        ready = False

    checks["storage"] = {
        "backend": "supabase" if settings.use_supabase_storage else "local_disk"
    }
    checks["whatsapp"] = {
        "enabled": settings.WHATSAPP_ENABLED,
        "configured": settings.whatsapp_configured,
        "display_number": settings.WHATSAPP_DISPLAY_NUMBER,
        "webhook_path": "/api/whatsapp/webhook",
    }

    return {
        "status": "ready" if ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
