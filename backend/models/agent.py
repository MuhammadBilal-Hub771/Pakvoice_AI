"""Pydantic models for the client-only content agent.

These shapes cross the SSE boundary verbatim, so they stay in snake_case and
are serialized with ``model_dump(mode="json")`` on the way out.
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    goal: str = Field(..., min_length=3, max_length=4000)
    use_knowledge_base: bool = True
    use_web_search: bool = True


class AgentCitation(BaseModel):
    doc_id: str = ""
    title: str = ""
    chunk_text: str = ""
    score: float = 0.0
    source: str = "kb"
    url: str = ""


class AgentPackItem(BaseModel):
    kind: Literal[
        "post", "email", "blog", "image", "calendar_day",
        "hashtags", "variant", "note",
    ]
    title: str = ""
    body: str = ""
    content_type: str = ""
    language: str = ""
    tone: str = ""
    image_url: str = ""
    image_id: str = ""
    sources: List[AgentCitation] = Field(default_factory=list)
    hashtags: List[str] = Field(default_factory=list)
    day: str = ""
    content_id: str = ""


class AgentValidationResult(BaseModel):
    passed: bool
    checks: List[dict] = Field(default_factory=list)


class CampaignPack(BaseModel):
    summary: str = ""
    items: List[AgentPackItem] = Field(default_factory=list)
    citations: List[AgentCitation] = Field(default_factory=list)
    validation: Optional[AgentValidationResult] = None


class AgentPlan(BaseModel):
    goals: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    use_knowledge_base: bool = True
    max_refine_iterations: int = 3


class AgentRunRecord(BaseModel):
    id: str
    user_id: str
    goal: str
    steps: List[dict] = Field(default_factory=list)
    success: bool = False
    created_at: datetime
