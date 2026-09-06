import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from loguru import logger

from config import settings
from core.middleware import (
    setup_logging,
    setup_cors,
    setup_rate_limiting,
    log_requests_middleware,
)
from api.auth import router as auth_router
from api.generate import router as generate_router
from api.documents import router as documents_router
from api.history import router as history_router
from api.admin import router as admin_router
from api.health import router as health_router
from api.images import router as images_router
from api.stt import router as stt_router
from api.whatsapp import router as whatsapp_router
from api.agent import router as agent_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"OpenAI Model: {settings.OPENAI_MODEL}")

    from db.json_store import log_active_backend

    log_active_backend()

    if settings.use_postgres:
        from db.session import check_connection

        if check_connection():
            from services.rag_service import rag_service

            logger.info(
                f"Postgres ready: {rag_service.get_document_count()} "
                f"chunks in knowledge base"
            )
        else:
            logger.error(
                "Cannot reach Postgres. Check SUPABASE_DB_URL and that "
                "db/schema.sql has been applied."
            )
    else:
        try:
            from db.chroma import get_or_create_collection

            collection = get_or_create_collection()
            logger.info(
                f"ChromaDB ready: {collection.count()} chunks in knowledge base"
            )
        except Exception as e:
            logger.warning(f"ChromaDB initialization failed: {e}")
            logger.warning("RAG features will be unavailable until it is configured")

    if settings.use_supabase_storage:
        logger.info("File storage: Supabase Storage")
    else:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.IMAGE_STORAGE_DIR, exist_ok=True)
        logger.warning(
            "File storage: local disk. Uploads and generated images will be "
            "lost when the container or VPS is replaced. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_KEY for durable storage."
        )

    if settings.WHATSAPP_ENABLED and not settings.whatsapp_configured:
        logger.error(
            "WHATSAPP_ENABLED is true but credentials are incomplete. The bot "
            "will not send messages. Required: WHATSAPP_PHONE_NUMBER_ID, "
            "WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET."
        )
    elif settings.whatsapp_configured:
        logger.info("WhatsApp Cloud API configured")

    from db.json_store import _seed_users

    _seed_users()

    yield

    if settings.use_postgres:
        from db.session import dispose_engine

        dispose_engine()
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Powered Pakistani Business Content Generator API"
    "\n\nGenerate culturally-aware business content for Pakistani "
    "businesses across multiple industries, cities, and languages."
    "\n\nSupports RAG (Retrieval-Augmented Generation) with "
    "knowledge base document upload, speech-to-text input, and a "
    "WhatsApp Cloud API bot.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "PakVoice AI",
        "url": "https://pakvoice.ai",
        "email": "support@pakvoice.ai",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# Setup middleware
setup_cors(app)
limiter = setup_rate_limiting(app)
app.middleware("http")(log_requests_middleware)

# Include routers
app.include_router(auth_router)
app.include_router(generate_router)
app.include_router(documents_router)
app.include_router(history_router)
app.include_router(admin_router)
app.include_router(health_router)
app.include_router(images_router)
app.include_router(stt_router)
app.include_router(whatsapp_router)
app.include_router(agent_router)
# Generated images are only served by the app when they live on local disk.
# With Supabase Storage they are fetched through short-lived signed URLs
# instead, so this mount — which has no authentication — is not created.
if not settings.use_supabase_storage:
    os.makedirs(settings.IMAGE_STORAGE_DIR, exist_ok=True)
    app.mount(
        "/static/images",
        StaticFiles(directory=settings.IMAGE_STORAGE_DIR),
        name="images",
    )


# === Exception Handlers ===


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "The requested resource was not found",
            "path": str(request.url.path),
            "method": request.method,
        },
    )


@app.exception_handler(422)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "path": str(request.url.path),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "path": str(request.url.path),
        },
    )


# === Root Endpoint ===


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "auth": "/api/auth/*",
            "generate": "/api/generate/*",
            "documents": "/api/documents/*",
            "history": "/api/history/*",
            "images": "/api/images/*",
            "stt": "/api/stt/*",
            "whatsapp": "/api/whatsapp/webhook",
            "agent": "/api/agent/*",
            "admin": "/api/admin/*",
            "health": "/api/health/*",
        },
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.DEBUG,
        log_level="info",
    )
