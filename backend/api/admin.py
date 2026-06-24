from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from loguru import logger

from models.user import TokenPayload, UserResponse
from core.dependencies import require_admin
from db.json_store import (
    list_users,
    update_user,
    delete_user,
    list_all_history,
    update_history,
    get_all_documents,
)
from services.rag_service import rag_service
from utils.formatters import calculate_trend

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])


@router.get("/stats", summary="Get admin dashboard stats")
async def get_stats(admin: TokenPayload = Depends(require_admin)):
    users = list_users()
    all_history, _ = list_all_history(page=1, page_size=10000)
    doc_count = rag_service.get_document_count()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    today_end = today_start + timedelta(days=1)

    # Content today vs yesterday
    content_today = sum(1 for h in all_history if today_start <= h.created_at < today_end)
    content_yesterday = sum(1 for h in all_history if yesterday_start <= h.created_at < today_start)

    # API calls today vs yesterday
    api_calls_today = content_today  # same as generations today
    api_calls_yesterday = content_yesterday

    # Active sessions: compare last hour vs previous hour
    one_hour_ago = now - timedelta(hours=1)
    two_hours_ago = now - timedelta(hours=2)
    active_last_hour = sum(1 for h in all_history if h.created_at >= one_hour_ago)
    active_prev_hour = sum(1 for h in all_history if two_hours_ago <= h.created_at < one_hour_ago)

    # Users: compare registrations this week vs last week
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    users_this_week = sum(1 for u in users if u.created_at and u.created_at >= week_ago)
    users_last_week = sum(1 for u in users if u.created_at and two_weeks_ago <= u.created_at < week_ago)

    # Docs: compare this week vs last week
    docs = get_all_documents()
    docs_this_week = sum(1 for d in docs if datetime.fromisoformat(d.get("created_at", "2000-01-01")).replace(tzinfo=timezone.utc) >= week_ago)
    docs_last_week = sum(1 for d in docs if two_weeks_ago <= datetime.fromisoformat(d.get("created_at", "2000-01-01")).replace(tzinfo=timezone.utc) < week_ago)

    total_tokens = sum(h.tokens_used for h in all_history)
    total_cost = sum(h.cost_usd for h in all_history)
    total_generations = len(all_history)
    active_users = len([u for u in users if u.is_active])

    content_type_stats = {}
    for h in all_history:
        ct = h.content_type
        content_type_stats[ct] = content_type_stats.get(ct, 0) + 1

    return {
        "total_users": len(users),
        "active_users": active_users,
        "total_generations": total_generations,
        "documents_in_kb": doc_count,
        "total_tokens_used": total_tokens,
        "total_cost_usd": round(total_cost, 6),
        "content_type_distribution": content_type_stats,
        "admin_user": {
            "email": admin.email,
            "role": admin.role,
        },
        # Fields for admin dashboard
        "content_today": content_today,
        "api_calls": total_generations,
        "api_limit": 50000,
        "active_sessions": active_last_hour,
        # Trend data
        "total_users_trend": calculate_trend(users_this_week, users_last_week),
        "content_today_trend": calculate_trend(content_today, content_yesterday),
        "api_calls_trend": calculate_trend(api_calls_today, api_calls_yesterday),
        "active_sessions_trend": calculate_trend(active_last_hour, active_prev_hour),
        "documents_in_kb_trend": calculate_trend(docs_this_week, docs_last_week),
    }


@router.get("/users", summary="List all users (admin only)")
async def get_users(admin: TokenPayload = Depends(require_admin)):
    users = list_users()
    return [
        UserResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            city=u.city,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.patch("/users/{user_id}", summary="Update user (admin only)")
async def patch_user(
    user_id: str,
    is_active: Optional[bool] = None,
    city: Optional[str] = None,
    admin: TokenPayload = Depends(require_admin),
):
    updates = {}
    if is_active is not None:
        updates["is_active"] = is_active
    if city is not None:
        updates["city"] = city

    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    updated = update_user(user_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    logger.info(f"Admin {admin.email} updated user {user_id}")
    return {"message": "User updated", "user_id": user_id}


@router.delete("/users/{user_id}", summary="Delete user (admin only)")
async def remove_user(
    user_id: str,
    admin: TokenPayload = Depends(require_admin),
):
    if user_id == admin.sub:
        raise HTTPException(
            status_code=400, detail="Cannot delete your own account"
        )

    success = delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    logger.info(f"Admin {admin.email} deleted user {user_id}")
    return {"message": "User deleted", "user_id": user_id}


@router.get("/content", summary="Get all generated content (admin only)")
async def get_all_content(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: TokenPayload = Depends(require_admin),
):
    items, total = list_all_history(page=page, page_size=page_size)
    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch(
    "/content/{content_id}/flag",
    summary="Flag/unflag content (admin only)",
)
async def flag_content(
    content_id: str,
    is_flagged: bool = True,
    admin: TokenPayload = Depends(require_admin),
):
    success = update_history(content_id, {"is_flagged": is_flagged})
    if not success:
        raise HTTPException(status_code=404, detail="Content not found")

    action = "flagged" if is_flagged else "unflagged"
    logger.info(f"Admin {admin.email} {action} content {content_id}")
    return {"message": f"Content {action}", "content_id": content_id}


@router.get("/api-usage", summary="Get API usage statistics (admin only)")
async def get_api_usage(admin: TokenPayload = Depends(require_admin)):
    all_history, _ = list_all_history(page=1, page_size=10000)

    daily_usage = {}
    for h in all_history:
        day = h.created_at.date().isoformat() if hasattr(h.created_at, "date") else str(h.created_at)[:10]
        if day not in daily_usage:
            daily_usage[day] = {
                "count": 0,
                "tokens": 0,
                "cost": 0.0,
            }
        daily_usage[day]["count"] += 1
        daily_usage[day]["tokens"] += h.tokens_used
        daily_usage[day]["cost"] += h.cost_usd

    return {
        "daily_usage": daily_usage,
        "total_generations": len(all_history),
        "total_tokens": sum(h.tokens_used for h in all_history),
        "total_cost": round(sum(h.cost_usd for h in all_history), 6),
    }


@router.get("/analytics", summary="Get detailed analytics (admin only)")
async def get_analytics(admin: TokenPayload = Depends(require_admin)):
    all_history, _ = list_all_history(page=1, page_size=10000)
    users = list_users()

    industry_distribution = {}
    city_distribution = {}
    tone_distribution = {}
    language_distribution = {}

    for h in all_history:
        industry_distribution[h.industry] = industry_distribution.get(h.industry, 0) + 1
        city_distribution[h.city] = city_distribution.get(h.city, 0) + 1
        tone_distribution[h.tone] = tone_distribution.get(h.tone, 0) + 1
        language_distribution[h.language] = language_distribution.get(h.language, 0) + 1

    return {
        "total_users": len(users),
        "total_generations": len(all_history),
        "industry_distribution": industry_distribution,
        "city_distribution": city_distribution,
        "tone_distribution": tone_distribution,
        "language_distribution": language_distribution,
    }
