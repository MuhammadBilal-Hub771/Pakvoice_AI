from typing import Optional, List

from fastapi import HTTPException
from loguru import logger

from db.json_store import (
    get_user_history,
    get_history_by_id_and_user,
    update_history_by_user,
    delete_history_item_by_user,
    list_all_history,
)
from models.history import (
    GenerationHistoryItem,
    HistoryListResponse,
    HistorySaveResponse,
    HistoryDeleteResponse,
    HistoryExportResponse,
)
from utils.formatters import format_content_for_export


class HistoryService:
    def get_user_history(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> HistoryListResponse:
        items, total = get_user_history(user_id, page, page_size)
        return HistoryListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_history_item(self, content_id: str, user_id: str) -> GenerationHistoryItem:
        item = get_history_by_id_and_user(content_id, user_id)
        if not item:
            raise HTTPException(
                status_code=403,
                detail=f"Content {content_id} not found or not accessible",
            )
        return item

    def save_item(self, content_id: str, user_id: str) -> HistorySaveResponse:
        item = get_history_by_id_and_user(content_id, user_id)
        if not item:
            raise HTTPException(
                status_code=403,
                detail=f"Content {content_id} not found or not accessible",
            )
        success = update_history_by_user(content_id, user_id, {"is_saved": True})
        return HistorySaveResponse(
            content_id=content_id,
            saved=success,
            message="Content saved successfully" if success else "Failed to save",
        )

    def delete_item(self, content_id: str, user_id: str) -> HistoryDeleteResponse:
        item = get_history_by_id_and_user(content_id, user_id)
        if not item:
            raise HTTPException(
                status_code=403,
                detail=f"Content {content_id} not found or not accessible",
            )
        success = delete_history_item_by_user(content_id, user_id)
        return HistoryDeleteResponse(
            content_id=content_id,
            deleted=success,
            message="Content deleted successfully" if success else "Failed to delete",
        )

    def export_item(self, content_id: str, user_id: str, fmt: str = "markdown") -> HistoryExportResponse:
        item = self.get_history_item(content_id, user_id)
        metadata = {
            "business_name": item.business_name,
            "content_type": item.content_type,
            "industry": item.industry,
            "city": item.city,
            "language": item.language,
            "tone": item.tone,
            "timestamp": str(item.created_at),
        }
        formatted_content = format_content_for_export(
            content=item.generated_content,
            metadata=metadata,
            fmt=fmt,
        )
        return HistoryExportResponse(
            content_id=content_id,
            content=formatted_content,
            metadata=metadata,
            format=fmt,
        )

    def list_all_history(
        self,
        page: int = 1,
        page_size: int = 50,
    ) -> HistoryListResponse:
        items, total = list_all_history(page, page_size)
        return HistoryListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )


history_service = HistoryService()
