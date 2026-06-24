import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional, AsyncIterator

from fastapi import HTTPException
from langchain_openai import ChatOpenAI
from langchain_community.callbacks import get_openai_callback
from loguru import logger

from config import settings
from models.content import (
    GenerateRequest,
    GenerateResponse,
    RefineRequest,
    RefineResponse,
    DocumentSource,
)
from prompts.pakistani_prompts import (
    build_generation_prompt,
    build_refinement_prompt,
)
from services.rag_service import RAGService
from db.json_store import save_generation_history
from models.history import GenerationHistoryItem


# Per-content-type token limits for faster generation on short content types
TOKEN_LIMITS = {
    "social_media": 400,
    "advertisement_copy": 300,
    "email_marketing": 600,
    "product_description": 500,
    "press_release": 800,
    "website_content": 800,
    "blog_article": 1500,
}

# Simple in-memory cache for RAG search results (by query hash)
_rag_cache: dict = {}


class AIService:
    def __init__(self):
        self._llm: Optional[ChatOpenAI] = None
        self._rag_service: Optional[RAGService] = None

    def _get_llm(self, max_tokens: int = 1500) -> ChatOpenAI:
        """Create a fresh LLM instance with the given max_tokens."""
        return ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=settings.AI_TEMPERATURE,
            max_tokens=max_tokens,
            openai_api_key=settings.OPENAI_API_KEY,
            request_timeout=60,
            streaming=False,
        )

    def _get_streaming_llm(self, max_tokens: int = 1500) -> ChatOpenAI:
        """Create a fresh streaming LLM instance."""
        return ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=settings.AI_TEMPERATURE,
            max_tokens=max_tokens,
            openai_api_key=settings.OPENAI_API_KEY,
            request_timeout=60,
            streaming=True,
        )

    def _get_rag_service(self) -> RAGService:
        if self._rag_service is None:
            self._rag_service = RAGService()
        return self._rag_service

    def _get_token_limit(self, content_type: str) -> int:
        return TOKEN_LIMITS.get(content_type, settings.AI_MAX_TOKENS)

    async def _retrieve_context(
        self, request: GenerateRequest
    ) -> tuple[List[str], List[DocumentSource]]:
        """Retrieve RAG context only if knowledge base is enabled and has documents."""
        context_docs: List[str] = []
        sources_used: List[DocumentSource] = []

        if not request.use_knowledge_base:
            return context_docs, sources_used

        rag = self._get_rag_service()
        doc_count = rag.get_document_count()

        if doc_count == 0:
            logger.info("Knowledge base is empty — skipping RAG search")
            return context_docs, sources_used

        search_query = (
            f"{request.business_name} {request.industry} "
            f"{request.city} {request.content_type.value}"
        )

        # Check cache first
        cache_key = f"{search_query}_{settings.RAG_TOP_K}"
        if cache_key in _rag_cache:
            logger.info("RAG cache hit")
            return _rag_cache[cache_key]

        rag_results = rag.search(
            query=search_query,
            top_k=settings.RAG_TOP_K,
            doc_ids=request.selected_doc_ids or None,
        )

        for result in rag_results:
            context_docs.append(result["document"])
            sources_used.append(
                DocumentSource(
                    doc_id=result["metadata"].get("doc_id", ""),
                    title=result["metadata"].get("title", "Unknown"),
                    category=result["metadata"].get("category", "uncategorized"),
                    chunk_text=result["document"][:200],
                    score=1.0 - result.get("distance", 0),
                )
            )

        # Cache result (keep cache under 100 entries)
        if len(_rag_cache) < 100:
            _rag_cache[cache_key] = (context_docs, sources_used)

        return context_docs, sources_used

    async def generate_content(
        self,
        request: GenerateRequest,
        user_id: str,
    ) -> GenerateResponse:
        start_time = time.time()
        content_id = str(uuid.uuid4())

        try:
            # Step 1: Retrieve RAG context (skipped if KB empty or disabled)
            context_docs, sources_used = await self._retrieve_context(request)

            # Step 2: Build prompt with Pakistani context
            messages = build_generation_prompt(
                business_name=request.business_name,
                business_description=request.business_description,
                content_type=request.content_type.value,
                industry=request.industry.value,
                city=request.city.value,
                language=request.language.value,
                tone=request.tone.value,
                key_message=request.key_message,
                target_audience=request.target_audience,
                context_docs=context_docs,
                content_length=request.content_length.value,
            )

            # Step 3: Generate — per-content-type token limits for speed
            max_tokens = self._get_token_limit(request.content_type.value)
            llm = self._get_llm(max_tokens)

            try:
                with get_openai_callback() as cb:
                    result = await asyncio.wait_for(
                        asyncio.to_thread(llm.invoke, messages),
                        timeout=25.0,
                    )

                    generated_content = result.content

                    token_data = {
                        "prompt_tokens": cb.prompt_tokens,
                        "completion_tokens": cb.completion_tokens,
                        "total_tokens": cb.total_tokens,
                        "total_cost_usd": cb.total_cost,
                    }
            except asyncio.TimeoutError:
                logger.error("Generation timed out after 25s")
                raise HTTPException(
                    status_code=504,
                    detail="Generation is taking too long. Please try with shorter content or fewer details.",
                )
            except Exception as e:
                self._handle_openai_error(e)

            generation_time = int((time.time() - start_time) * 1000)

            # Step 4: Build response
            response = GenerateResponse(
                content_id=content_id,
                generated_content=generated_content,
                content_type=request.content_type.value,
                language=request.language.value,
                sources_used=sources_used,
                tokens_used=token_data["total_tokens"],
                cost_usd=token_data["total_cost_usd"],
                generation_time_ms=generation_time,
                timestamp=datetime.now(timezone.utc),
            )

            # Step 5: Save to history (fire-and-forget, non-blocking)
            try:
                history_item = GenerationHistoryItem(
                    content_id=content_id,
                    user_id=user_id,
                    business_name=request.business_name,
                    content_type=request.content_type.value,
                    industry=request.industry.value,
                    city=request.city.value,
                    language=request.language.value,
                    tone=request.tone.value,
                    generated_content=generated_content,
                    tokens_used=token_data["total_tokens"],
                    cost_usd=token_data["total_cost_usd"],
                    generation_time_ms=generation_time,
                    sources_used=[s.model_dump() for s in sources_used],
                    created_at=datetime.now(timezone.utc),
                )
                save_generation_history(history_item)
            except Exception as e:
                logger.warning(f"Failed to save history: {e}")

            return response

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Content generation failed: {str(e)}",
            )

    async def generate_content_stream(
        self,
        request: GenerateRequest,
        user_id: str,
        content_id: str = "",
    ) -> AsyncIterator[str]:
        """Stream content as it's generated — user sees text word-by-word."""
        if not content_id:
            content_id = str(uuid.uuid4())

        try:
            context_docs, sources_used = await self._retrieve_context(request)

            messages = build_generation_prompt(
                business_name=request.business_name,
                business_description=request.business_description,
                content_type=request.content_type.value,
                industry=request.industry.value,
                city=request.city.value,
                language=request.language.value,
                tone=request.tone.value,
                key_message=request.key_message,
                target_audience=request.target_audience,
                context_docs=context_docs,
                content_length=request.content_length.value,
            )

            max_tokens = self._get_token_limit(request.content_type.value)
            llm = self._get_streaming_llm(max_tokens)

            full_content = ""
            try:
                async for chunk in llm.astream(messages):
                    token = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if token:
                        full_content += token
                        yield token
            except Exception as e:
                logger.error(f"Stream generation error: {e}")
                if full_content:
                    yield "\n\n[Generation was interrupted — partial content shown]"
                else:
                    raise HTTPException(status_code=500, detail=f"Stream failed: {str(e)}")

            # Save to history after stream completes
            try:
                history_item = GenerationHistoryItem(
                    content_id=content_id,
                    user_id=user_id,
                    business_name=request.business_name,
                    content_type=request.content_type.value,
                    industry=request.industry.value,
                    city=request.city.value,
                    language=request.language.value,
                    tone=request.tone.value,
                    generated_content=full_content,
                    tokens_used=0,
                    cost_usd=0.0,
                    generation_time_ms=0,
                    sources_used=[s.model_dump() for s in sources_used],
                    created_at=datetime.now(timezone.utc),
                )
                save_generation_history(history_item)
            except Exception as e:
                logger.warning(f"Failed to save stream history: {e}")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Stream generation failed: {e}")
            yield f"\n\n[Error: {str(e)}]"

    async def refine_content(
        self,
        request: RefineRequest,
        user_id: str,
    ) -> RefineResponse:
        try:
            messages = build_refinement_prompt(
                original_content=request.original_content,
                refinement_instruction=request.refinement_instruction,
            )

            llm = self._get_llm(max_tokens=800)

            tokens_used = 0
            with get_openai_callback() as cb:
                result = await asyncio.to_thread(llm.invoke, messages)
                refined_content = result.content
                tokens_used = cb.total_tokens

            return RefineResponse(
                content_id=request.content_id,
                original_content=request.original_content,
                refined_content=refined_content,
                refinement_instruction=request.refinement_instruction,
                tokens_used=tokens_used,
                timestamp=datetime.now(timezone.utc),
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Content refinement failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Content refinement failed: {str(e)}",
            )

    def _handle_openai_error(self, error: Exception):
        error_msg = str(error).lower()

        if "authentication" in error_msg or "api key" in error_msg:
            raise HTTPException(
                status_code=401,
                detail="Invalid OpenAI API key. Please check your configuration.",
            )
        elif "rate limit" in error_msg or "rate_limit" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="OpenAI rate limit reached. Please try again in a moment.",
            )
        elif "quota" in error_msg or "insufficient_quota" in error_msg:
            raise HTTPException(
                status_code=402,
                detail="OpenAI quota exceeded. Please check your billing.",
            )
        elif "connection" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="Cannot connect to OpenAI. Please check your internet connection.",
            )
        elif "timeout" in error_msg:
            raise HTTPException(
                status_code=504,
                detail="OpenAI request timed out. Please try again.",
            )
        elif "context length" in error_msg or "maximum context" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Content too long for the model. Try reducing input size.",
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI error: {str(error)}",
            )


ai_service = AIService()
