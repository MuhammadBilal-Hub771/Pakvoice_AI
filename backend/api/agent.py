"""Client content agent API.

The chat endpoint streams SSE events produced by ``agent_service.run``. It is
guarded by ``require_client`` so admin accounts are rejected with a 403.
"""

import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from loguru import logger

from config import settings
from core.dependencies import require_client
from core.rate_limit import limiter
from models.agent import AgentChatRequest
from models.user import TokenPayload
from services.agent_service import TOOL_META, content_agent

router = APIRouter(prefix="/api/agent", tags=["Agent"])


@router.post(
    "/chat",
    summary="Run the client content agent (SSE stream)",
)
@limiter.limit(settings.RATE_LIMIT_AGENT)
async def agent_chat(
    request: Request,
    body: AgentChatRequest,
    current_user: TokenPayload = Depends(require_client),
):
    logger.info(
        f"Agent run request from {current_user.email}: "
        f"use_kb={body.use_knowledge_base}, use_web={body.use_web_search}, "
        f"goal_length={len(body.goal)}"
    )

    async def event_stream():
        async for event in content_agent.run(
            body.goal,
            current_user.sub,
            body.use_knowledge_base,
            body.use_web_search,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/tools",
    summary="List the agent's tools (for UI chips)",
)
async def list_tools(
    current_user: TokenPayload = Depends(require_client),
):
    return {"tools": TOOL_META}
