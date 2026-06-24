from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from loguru import logger

from models.history import (
    HistoryListResponse,
    HistorySaveResponse,
    HistoryDeleteResponse,
    HistoryExportResponse,
)
from models.user import TokenPayload
from core.dependencies import get_current_user
from services.history_service import history_service
from utils.formatters import calculate_trend
from db.json_store import get_user_history

router = APIRouter(prefix="/api/history", tags=["Generation History"])


@router.get(
    "/",
    response_model=HistoryListResponse,
    summary="Get user's generation history",
)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: TokenPayload = Depends(get_current_user),
):
    return history_service.get_user_history(
        user_id=current_user.sub,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/stats",
    summary="Get user stats with trends",
)
async def get_user_stats(current_user: TokenPayload = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    month_ago = now - timedelta(days=30)

    user_history, total = get_user_history(current_user.sub, page=1, page_size=10000)

    # Total generated: this week vs last week
    this_week = [h for h in user_history if h.created_at and h.created_at >= week_ago]
    last_week = [h for h in user_history if h.created_at and two_weeks_ago <= h.created_at < week_ago]

    # This month vs last month
    this_month = [h for h in user_history if h.created_at and h.created_at >= month_ago]
    last_month_start = month_ago - timedelta(days=30)
    last_month = [h for h in user_history if h.created_at and last_month_start <= h.created_at < month_ago]

    # Saved content: this week vs last week
    saved_this_week = [h for h in this_week if h.is_saved]
    saved_last_week = [h for h in last_week if h.is_saved]

    # Knowledge docs count - only count THIS user's documents
    from db.json_store import get_user_documents
    user_docs = get_user_documents(current_user.sub)
    doc_count = len(user_docs)

    # For trend, count docs uploaded this week vs last week
    docs_this_week = [
        d for d in user_docs
        if d.get("created_at") and isinstance(d["created_at"], str)
        and datetime.fromisoformat(d["created_at"]) >= week_ago
    ]
    docs_last_week = [
        d for d in user_docs
        if d.get("created_at") and isinstance(d["created_at"], str)
        and two_weeks_ago <= datetime.fromisoformat(d["created_at"]) < week_ago
    ]

    return {
        "total_generated": len(user_history),
        "this_month": len(this_month),
        "saved_content": sum(1 for h in user_history if h.is_saved),
        "knowledge_docs": doc_count,
        # Trends
        "total_generated_trend": calculate_trend(len(this_week), len(last_week)),
        "this_month_trend": calculate_trend(len(this_month), len(last_month)),
        "saved_content_trend": calculate_trend(len(saved_this_week), len(saved_last_week)),
        "knowledge_docs_trend": calculate_trend(len(docs_this_week), len(docs_last_week)),
    }


@router.get(
    "/{content_id}",
    summary="Get a specific history item",
)
async def get_history_item(
    content_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    item = history_service.get_history_item(content_id, user_id=current_user.sub)
    return item


@router.post(
    "/{content_id}/save",
    response_model=HistorySaveResponse,
    summary="Save a generation to history",
)
async def save_history_item(
    content_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    logger.info(f"User {current_user.email} saving content {content_id}")
    return history_service.save_item(content_id, user_id=current_user.sub)


@router.delete(
    "/{content_id}",
    response_model=HistoryDeleteResponse,
    summary="Delete a history item",
)
async def delete_history_item(
    content_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    logger.info(f"User {current_user.email} deleting content {content_id}")
    return history_service.delete_item(content_id, user_id=current_user.sub)


@router.get(
    "/export/{content_id}",
    response_model=HistoryExportResponse,
    summary="Export content in markdown/html/plain",
)
async def export_content(
    content_id: str,
    format: str = Query("markdown", alias="format"),
    current_user: TokenPayload = Depends(get_current_user),
):
    if format not in ["markdown", "html", "plain"]:
        format = "markdown"
    return history_service.export_item(content_id, user_id=current_user.sub, fmt=format)
