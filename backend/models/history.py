from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class GenerationHistoryItem(BaseModel):
    content_id: str
    user_id: str
    business_name: str
    content_type: str
    industry: str
    city: str
    language: str
    tone: str
    generated_content: str
    tokens_used: int
    cost_usd: float
    generation_time_ms: int
    sources_used: List[dict]
    is_saved: bool = False
    is_flagged: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


class HistoryListResponse(BaseModel):
    items: List[GenerationHistoryItem]
    total: int
    page: int
    page_size: int


class HistorySaveResponse(BaseModel):
    content_id: str
    saved: bool
    message: str


class HistoryDeleteResponse(BaseModel):
    content_id: str
    deleted: bool
    message: str


class HistoryExportResponse(BaseModel):
    content_id: str
    content: str
    metadata: dict
    format: str = "markdown"
