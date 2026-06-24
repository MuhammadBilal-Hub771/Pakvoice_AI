import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.trustedhost import TrustedHostMiddleware
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"OpenAI Model: {settings.OPENAI_MODEL}")

    # Initialize ChromaDB
    try:
        from db.chroma import get_or_create_collection

        collection = get_or_create_collection()
        doc_count = collection.count()
        logger.info(f"ChromaDB ready: {doc_count} documents in knowledge base")
    except Exception as e:
        logger.warning(f"ChromaDB initialization failed: {e}")
        logger.warning("RAG features will be unavailable until ChromaDB is configured")

    # Upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Powered Pakistani Business Content Generator API"
    "\n\nGenerate culturally-aware business content for Pakistani "
    "businesses across multiple industries, cities, and languages."
    "\n\nSupports RAG (Retrieval-Augmented Generation) with "
    "knowledge base document upload.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "ContentPK AI",
        "url": "https://contentpk.ai",
        "email": "support@contentpk.ai",
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

# Mount static files for generated images
os.makedirs(settings.IMAGE_STORAGE_DIR, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=settings.IMAGE_STORAGE_DIR), name="images")
# Legacy mount for backward compatibility
app.mount("/generated_images", StaticFiles(directory=settings.IMAGE_STORAGE_DIR), name="generated_images")


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
            "body": exc.body,
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
            "admin": "/api/admin/*",
            "health": "/api/health/*",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )
