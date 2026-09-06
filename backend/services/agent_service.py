"""Client-only content agent: planner/executor loop over deterministic tools.

The LLM is the writer and the decision-maker; this module is pure orchestration.
It turns a user goal into a plan, drives an OpenAI tool-calling loop, dispatches
each tool to the existing singletons (``ai_service``, ``rag_service``,
``image_service``) or to the store, then runs the LLM-free validators and emits
a final ``CampaignPack``.

``run`` is an async generator of SSE-style event dicts and never raises: any
provider or step-cap failure becomes an ``{"type": "error"}`` event.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional

from loguru import logger
from openai import AsyncOpenAI

from config import settings
from models.agent import (
    AgentCitation,
    AgentPackItem,
    AgentPlan,
    AgentValidationResult,
    CampaignPack,
)
from models.content import (
    City,
    ContentLength,
    ContentType,
    GenerateRequest,
    Industry,
    Language,
    RefineRequest,
    Tone,
)
from services.agent_validators import merge_hashtags, quality_check, validate_pack
from services.ai_service import ai_service
from services.image_service import image_service
from services.rag_service import rag_service
from services.web_search import scrape_page, web_search
from db.json_store import (
    get_user_by_id,
    get_user_documents,
    get_user_history,
    save_agent_run,
    update_history,
)


# --- static tool metadata (also served to the UI via /api/agent/tools) ---

TOOL_META: List[Dict[str, str]] = [
    {"name": "get_profile", "description": "Read the user's profile (name, city, industry)"},
    {"name": "list_kb_docs", "description": "List the user's knowledge-base documents"},
    {"name": "search_kb", "description": "Search the knowledge base for relevant chunks"},
    {"name": "generate_content", "description": "Generate marketing content with the AI writer"},
    {"name": "refine_content", "description": "Refine a previously generated piece of content"},
    {"name": "generate_image", "description": "Generate an image for a piece of content"},
    {"name": "suggest_hashtags", "description": "Suggest Pakistani hashtags for content"},
    {"name": "make_variants", "description": "Produce alternative phrasings of content"},
    {"name": "plan_calendar", "description": "Plan a day-by-day posting calendar"},
    {"name": "list_history", "description": "List the user's recently generated content"},
    {"name": "save_history", "description": "Mark a generated piece of content as saved"},
    {"name": "run_quality_check", "description": "Run deterministic quality checks on copy"},
    {"name": "web_search", "description": "Search the live web for current, trending, or factual information"},
    {"name": "scrape_page", "description": "Fetch a web page and extract clean readable text"},
]

_CONTENT_TYPES = [e.value for e in ContentType]
_INDUSTRIES = [e.value for e in Industry]
_CITIES = [e.value for e in City]
_LANGUAGES = [e.value for e in Language]
_TONES = [e.value for e in Tone]
_LENGTHS = [e.value for e in ContentLength]

_CONTENT_KIND = {
    "social_media": "post",
    "advertisement_copy": "post",
    "blog_article": "blog",
    "email_marketing": "email",
    "product_description": "note",
    "press_release": "note",
    "website_content": "note",
}

_TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {"type": "function", "function": {"name": "get_profile", "description": "Read the current user's profile.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "list_kb_docs", "description": "List the user's knowledge-base documents.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "search_kb", "description": "Search the user's knowledge base for relevant chunks.", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "generate_content", "description": "Generate marketing content for a Pakistani business.", "parameters": {"type": "object", "properties": {
        "business_name": {"type": "string", "description": "Business name"},
        "business_description": {"type": "string", "description": "What the business does"},
        "content_type": {"type": "string", "enum": _CONTENT_TYPES},
        "industry": {"type": "string", "enum": _INDUSTRIES},
        "city": {"type": "string", "enum": _CITIES},
        "language": {"type": "string", "enum": _LANGUAGES},
        "tone": {"type": "string", "enum": _TONES},
        "content_length": {"type": "string", "enum": _LENGTHS},
        "key_message": {"type": "string", "description": "Core message to convey"},
        "target_audience": {"type": "string", "description": "Who the content is for"},
    }, "required": ["business_name", "content_type"]}}},
    {"type": "function", "function": {"name": "refine_content", "description": "Refine an existing piece of content.", "parameters": {"type": "object", "properties": {
        "content_id": {"type": "string", "description": "Optional id of content to refine"},
        "original_content": {"type": "string", "description": "The text to refine"},
        "refinement_instruction": {"type": "string", "description": "How to change it"},
    }, "required": ["original_content", "refinement_instruction"]}}},
    {"type": "function", "function": {"name": "generate_image", "description": "Generate an image from content.", "parameters": {"type": "object", "properties": {
        "content": {"type": "string", "description": "Source content for the image"},
        "image_type": {"type": "string", "enum": ["social_media", "thumbnail"]},
    }, "required": ["content"]}}},
    {"type": "function", "function": {"name": "suggest_hashtags", "description": "Suggest Pakistani hashtags.", "parameters": {"type": "object", "properties": {
        "industry": {"type": "string"}, "city": {"type": "string"}, "content": {"type": "string"},
    }, "required": []}}},
    {"type": "function", "function": {"name": "make_variants", "description": "Produce alternative phrasings of content.", "parameters": {"type": "object", "properties": {
        "content": {"type": "string"}, "count": {"type": "integer"},
    }, "required": ["content"]}}},
    {"type": "function", "function": {"name": "plan_calendar", "description": "Plan a day-by-day posting calendar.", "parameters": {"type": "object", "properties": {
        "days": {"type": "integer"}, "topic": {"type": "string"}, "content_type": {"type": "string"},
    }, "required": ["days"]}}},
    {"type": "function", "function": {"name": "list_history", "description": "List the user's recently generated content.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "save_history", "description": "Mark generated content as saved.", "parameters": {"type": "object", "properties": {
        "content_id": {"type": "string"},
    }, "required": ["content_id"]}}},
    {"type": "function", "function": {"name": "run_quality_check", "description": "Run deterministic quality checks on copy.", "parameters": {"type": "object", "properties": {
        "content": {"type": "string"}, "content_length": {"type": "string", "enum": _LENGTHS},
    }, "required": ["content"]}}},
]

_WEB_TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {"type": "function", "function": {"name": "web_search", "description": "Search the live web for current, trending, or factual information.", "parameters": {"type": "object", "properties": {
        "query": {"type": "string", "description": "Search query"},
        "max_results": {"type": "integer", "description": "Max results to return (1-10)"},
    }, "required": ["query"]}}},
    {"type": "function", "function": {"name": "scrape_page", "description": "Fetch a web page and extract clean readable text.", "parameters": {"type": "object", "properties": {
        "url": {"type": "string", "description": "Full http(s) URL to scrape"},
    }, "required": ["url"]}}},
]


def _tool_schemas(use_web_search: bool) -> List[Dict[str, Any]]:
    if use_web_search:
        return _TOOL_SCHEMAS + _WEB_TOOL_SCHEMAS
    return _TOOL_SCHEMAS


def _system_prompt(use_web_search: bool) -> str:
    web_hint = (
        " You also have live web search and page scraping tools. Use them when the "
        "goal asks for the latest, trending, current, or real-time information, news, "
        "market research, or competitor facts beyond the knowledge base."
        if use_web_search
        else ""
    )
    return (
        "You are the PakVoice AI content agent acting for a single client account. "
        "You write marketing content for Pakistani businesses. You have tools to read "
        "the user profile, search their knowledge base, generate and refine content, "
        "generate images, suggest hashtags, create variants, plan a posting calendar, "
        "inspect history, save content, and run quality checks." + web_hint +
        " Accomplish the user's goal by calling the right tools in sequence. Prefer "
        "generate_content for any written copy. Never invent data you did not retrieve. "
        "When content fails a quality check, refine it or search for better source "
        "material, then re-generate. When the goal is satisfied, stop calling tools and "
        "emit no further tool calls."
    )


def _to_enum(enum_cls, value, default):
    if value is None:
        return default
    try:
        return enum_cls(str(value).strip().lower().replace(" ", "_").replace("-", "_"))
    except ValueError:
        return default


def _clean_str(value: Any, fallback: str, min_len: int = 1, max_len: int = 10_000) -> str:
    s = (value or "").strip()
    if len(s) < min_len:
        s = fallback
    return s[:max_len]


class ContentAgent:
    def __init__(self):
        self._openai: Optional[AsyncOpenAI] = None

    def _client(self) -> AsyncOpenAI:
        if self._openai is None:
            self._openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai

    # -- main entrypoint -----------------------------------------------------

    async def run(
        self,
        goal: str,
        user_id: str,
        use_knowledge_base: bool,
        use_web_search: bool = True,
    ) -> AsyncIterator[dict]:
        state: Dict[str, Any] = {
            "citations": [],
            "items": [],
            "steps": [],
            "use_kb": use_knowledge_base,
            "use_web": use_web_search,
            "last_draft": "",
            "last_content_length": "medium",
            "loop_count": 0,
            "refine_count": 0,
        }
        success = False
        try:
            plan = await self._make_plan(goal, use_knowledge_base, use_web_search)
            yield {"type": "plan", "plan": plan.model_dump(mode="json")}

            max_refine = max(1, min(int(plan.max_refine_iterations or 3), settings.AGENT_MAX_REFINE_ITERATIONS))
            schemas = _tool_schemas(use_web_search)
            messages = [
                {"role": "system", "content": _system_prompt(use_web_search)},
                {"role": "user", "content": self._user_prompt(goal, plan)},
            ]

            for _ in range(settings.AGENT_MAX_STEPS):
                resp = await self._chat(messages, schemas)
                tool_calls = resp.get("tool_calls") or []
                if not tool_calls:
                    break

                messages.append({
                    "role": "assistant",
                    "content": resp.get("content") or "",
                    "tool_calls": tool_calls,
                })

                for tc in tool_calls:
                    name = tc["function"]["name"]
                    yield {"type": "tool_start", "tool": name}
                    state["steps"].append({"tool": name, "status": "started"})
                    try:
                        args = json.loads(tc["function"].get("arguments") or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    result = await self._execute_tool(name, args, user_id, state)
                    state["steps"].append({"tool": name, "status": "ok"})
                    yield {"type": "tool_end", "tool": name, "result": result}

                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(result, ensure_ascii=False),
                    }

                    # Loop engineering: after drafting/refining, run the
                    # deterministic quality checks and, if they fail within the
                    # refinement budget, push the failure back so the LLM can
                    # refine or re-search instead of shipping bad copy.
                    if name in ("generate_content", "refine_content") and state["last_draft"]:
                        qc = quality_check(state["last_draft"], state["last_content_length"])
                        if not qc["passed"] and state["refine_count"] < max_refine:
                            state["refine_count"] += 1
                            state["loop_count"] += 1
                            failed_checks = [c for c in qc["checks"] if not c["passed"]]
                            yield {
                                "type": "loop",
                                "iteration": state["loop_count"],
                                "reason": "quality check failed; refining or re-searching",
                                "failed_checks": failed_checks,
                            }
                            tool_message["content"] = json.dumps(
                                {
                                    **result,
                                    "quality_check": qc,
                                    "instruction": (
                                        "Quality checks failed. Refine the content or search the "
                                        "web or knowledge base for more accurate source material, "
                                        "then re-generate."
                                    ),
                                },
                                ensure_ascii=False,
                            )

                    messages.append(tool_message)

            summary = await self._summarize(goal, state)

            if settings.AGENT_REQUIRE_VALIDATION:
                validation = validate_pack(
                    [i.model_dump() for i in state["items"]],
                    [c.model_dump() for c in state["citations"]],
                    use_knowledge_base,
                )
            else:
                validation = {"passed": True, "checks": []}

            pack = CampaignPack(
                summary=summary,
                items=state["items"],
                citations=state["citations"],
                validation=AgentValidationResult(**validation),
            )

            yield {"type": "validation", "result": validation}
            yield {"type": "final_pack", "pack": pack.model_dump(mode="json")}
            success = True

        except Exception as e:  # provider / step-cap / unexpected — never raise
            logger.error(f"Agent run failed: {e}")
            yield {"type": "error", "message": str(e)}

        finally:
            try:
                save_agent_run({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "goal": goal,
                    "steps": state["steps"],
                    "success": success,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
            except Exception as e:
                logger.warning(f"Failed to persist agent run audit: {e}")

    # -- LLM helpers ---------------------------------------------------------

    async def _chat(self, messages: List[dict], schemas: List[Dict[str, Any]]) -> dict:
        resp = await self._client().chat.completions.create(
            model=settings.agent_model,
            messages=messages,
            tools=schemas,
            tool_choice="auto",
            temperature=0.4,
        )
        msg = resp.choices[0].message
        tool_calls = []
        for tc in msg.tool_calls or []:
            tool_calls.append({
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments or "{}"},
            })
        return {"content": msg.content or "", "tool_calls": tool_calls}

    async def _json_complete(self, system: str, user: str, max_tokens: int = 600) -> dict:
        resp = await self._client().chat.completions.create(
            model=settings.agent_model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        return json.loads(raw)

    def _user_prompt(self, goal: str, plan: AgentPlan) -> str:
        plan_json = json.dumps(plan.model_dump(mode="json"), ensure_ascii=False)
        return f"Goal: {goal}\n\nWorking plan:\n{plan_json}\n\nUse the tools to complete the goal."

    async def _make_plan(self, goal: str, use_kb: bool, use_web: bool = True) -> AgentPlan:
        system = "You plan marketing work for a Pakistani content agent. Output strict JSON only."
        web_note = (
            "You may use live web search/scrape tools for current information."
            if use_web
            else "Do not use web tools; rely on the knowledge base and static knowledge."
        )
        user = (
            f"Goal: {goal}\nUse knowledge base: {use_kb}\n{web_note}\n"
            "Return JSON with keys: goals (list of strings), tools (list of tool names), "
            "constraints (list of strings), use_knowledge_base (bool), "
            "max_refine_iterations (int 1-5)."
        )
        try:
            data = await self._json_complete(system, user, max_tokens=500)
        except Exception as e:
            logger.warning(f"Plan generation failed, using default: {e}")
            data = {}
        return AgentPlan(
            goals=data.get("goals") or [goal],
            tools=data.get("tools") or [],
            constraints=data.get("constraints") or [],
            use_knowledge_base=bool(data.get("use_knowledge_base", use_kb)),
            max_refine_iterations=int(data.get("max_refine_iterations", 3) or 3),
        )

    async def _summarize(self, goal: str, state: dict) -> str:
        items: List[AgentPackItem] = state["items"]
        if not items:
            return f"Agent produced no content for goal: {goal}"
        kinds = ", ".join(sorted({i.kind for i in items}))
        try:
            resp = await self._client().chat.completions.create(
                model=settings.agent_model,
                messages=[
                    {"role": "system", "content": "Summarize a marketing campaign in 2-3 concise sentences."},
                    {"role": "user", "content": f"Goal: {goal}\nProduced {len(items)} item(s) of kinds: {kinds}."},
                ],
                temperature=0.3,
                max_tokens=200,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as e:
            logger.warning(f"Summary failed, using fallback: {e}")
            return f"Campaign pack with {len(items)} item(s) ({kinds}) produced for: {goal}"

    async def _llm_hashtags(self, content: str, industry: str, city: str) -> List[str]:
        try:
            data = await self._json_complete(
                "Suggest Pakistani marketing hashtags. Output strict JSON with key 'hashtags' (array of strings).",
                f"Industry: {industry}\nCity: {city}\nContent: {content[:1000]}",
                max_tokens=300,
            )
        except Exception as e:
            logger.warning(f"LLM hashtag suggestion failed: {e}")
            return []
        return [str(t) for t in (data.get("hashtags") or [])][:20]

    async def _llm_variants(self, content: str, count: int) -> List[str]:
        data = await self._json_complete(
            "Rewrite marketing copy. Output strict JSON with key 'variants' (array of strings).",
            f"Original:\n{content[:2000]}\n\nProduce {count} distinct variants.",
            max_tokens=1000,
        )
        return [str(v) for v in (data.get("variants") or []) if str(v).strip()][:count]

    # -- tool dispatch -------------------------------------------------------

    _TOOL_HANDLERS = {
        "get_profile": "_tool_get_profile",
        "list_kb_docs": "_tool_list_kb_docs",
        "search_kb": "_tool_search_kb",
        "generate_content": "_tool_generate_content",
        "refine_content": "_tool_refine_content",
        "generate_image": "_tool_generate_image",
        "suggest_hashtags": "_tool_suggest_hashtags",
        "make_variants": "_tool_make_variants",
        "plan_calendar": "_tool_plan_calendar",
        "list_history": "_tool_list_history",
        "save_history": "_tool_save_history",
        "run_quality_check": "_tool_run_quality_check",
        "web_search": "_tool_web_search",
        "scrape_page": "_tool_scrape_page",
    }

    async def _execute_tool(self, name: str, args: dict, user_id: str, state: dict) -> dict:
        method = self._TOOL_HANDLERS.get(name)
        if method is None:
            return {"error": f"unknown tool: {name}"}
        return await getattr(self, method)(args, user_id, state)

    # -- tool implementations (all scoped to user_id) ------------------------

    async def _tool_get_profile(self, args: dict, user_id: str, state: dict) -> dict:
        user = get_user_by_id(user_id)
        if not user:
            return {"error": "profile not found"}
        return {
            "name": user.name,
            "email": user.email,
            "city": user.city or "",
            "industry": user.industry or "",
        }

    async def _tool_list_kb_docs(self, args: dict, user_id: str, state: dict) -> dict:
        docs = get_user_documents(user_id)
        return {
            "documents": [
                {
                    "doc_id": d.get("doc_id"),
                    "title": d.get("title"),
                    "category": d.get("category"),
                    "tags": d.get("tags", []),
                }
                for d in docs
            ]
        }

    async def _tool_search_kb(self, args: dict, user_id: str, state: dict) -> dict:
        query = (args.get("query") or "").strip()
        if not query:
            return {"error": "query is required"}
        results = rag_service.search(query, user_id, top_k=settings.RAG_TOP_K)
        citations: List[AgentCitation] = []
        for r in results:
            meta = r.get("metadata") or {}
            citations.append(AgentCitation(
                doc_id=meta.get("doc_id", ""),
                title=meta.get("title", "Unknown"),
                chunk_text=(r.get("document") or "")[:300],
                score=round(1.0 - float(r.get("distance", 0.0)), 4),
            ))
        for c in citations:
            if c.doc_id:
                state["citations"].append(c)
        return {"results": [c.model_dump() for c in citations]}

    async def _tool_web_search(self, args: dict, user_id: str, state: dict) -> dict:
        query = (args.get("query") or "").strip()
        if not query:
            return {"error": "query is required"}
        if not settings.WEB_SEARCH_ENABLED:
            return {"error": "web search is disabled"}
        try:
            max_results = int(args.get("max_results", settings.WEB_SEARCH_MAX_RESULTS))
        except (TypeError, ValueError):
            max_results = settings.WEB_SEARCH_MAX_RESULTS
        results = await web_search(query, max_results=max_results)
        citations: List[AgentCitation] = []
        for r in results:
            citations.append(AgentCitation(
                title=r.get("title", ""),
                url=r.get("url", ""),
                chunk_text=r.get("snippet", "")[:300],
                source="web",
            ))
        for c in citations:
            if c.url:
                state["citations"].append(c)
        return {"results": [c.model_dump() for c in citations]}

    async def _tool_scrape_page(self, args: dict, user_id: str, state: dict) -> dict:
        url = (args.get("url") or "").strip()
        if not url:
            return {"error": "url is required"}
        if not settings.WEB_SEARCH_ENABLED:
            return {"error": "web scraping is disabled"}
        data = await scrape_page(url, max_chars=settings.WEB_SCRAPE_MAX_CHARS)
        if data.get("title") or data.get("text"):
            state["citations"].append(AgentCitation(
                title=data.get("title", ""),
                url=url,
                chunk_text=(data.get("text") or "")[:300],
                source="web",
            ))
        return {
            "title": data.get("title", ""),
            "url": url,
            "text": (data.get("text") or "")[:settings.WEB_SCRAPE_MAX_CHARS],
        }

    async def _tool_generate_content(self, args: dict, user_id: str, state: dict) -> dict:
        content_type = _to_enum(ContentType, args.get("content_type"), ContentType.SOCIAL_MEDIA)
        req = GenerateRequest(
            business_name=_clean_str(args.get("business_name"), "Pakistani Business", max_len=200),
            business_description=_clean_str(
                args.get("business_description"),
                "Quality products and services for the Pakistani market.",
                min_len=3,
                max_len=5000,
            ),
            content_type=content_type,
            industry=_to_enum(Industry, args.get("industry"), Industry.ECOMMERCE),
            city=_to_enum(City, args.get("city"), City.KARACHI),
            language=_to_enum(Language, args.get("language"), Language.ENGLISH),
            tone=_to_enum(Tone, args.get("tone"), Tone.PROFESSIONAL),
            content_length=_to_enum(ContentLength, args.get("content_length"), ContentLength.MEDIUM),
            key_message=(args.get("key_message") or "")[:500],
            target_audience=(args.get("target_audience") or "")[:500],
            use_knowledge_base=state["use_kb"],
            selected_doc_ids=None,
        )
        resp = await ai_service.generate_content(request=req, user_id=user_id, source_channel="agent")

        sources = [
            AgentCitation(doc_id=s.doc_id, title=s.title, chunk_text=s.chunk_text, score=s.score)
            for s in resp.sources_used
        ]
        for c in sources:
            if c.doc_id:
                state["citations"].append(c)

        item = AgentPackItem(
            kind=_CONTENT_KIND.get(resp.content_type, "note"),
            title=req.business_name,
            body=resp.generated_content,
            content_type=resp.content_type,
            language=resp.language,
            tone=req.tone.value,
            sources=sources,
            content_id=resp.content_id,
        )
        state["items"].append(item)
        state["last_draft"] = resp.generated_content
        state["last_content_length"] = req.content_length.value
        return {
            "content_id": resp.content_id,
            "content_type": resp.content_type,
            "language": resp.language,
            "preview": resp.generated_content[:300],
        }

    async def _tool_refine_content(self, args: dict, user_id: str, state: dict) -> dict:
        original = (args.get("original_content") or "").strip()
        instruction = (args.get("refinement_instruction") or "").strip()
        content_id = (args.get("content_id") or "").strip()
        if not original:
            return {"error": "original_content is required"}
        if len(instruction) < 5:
            return {"error": "refinement_instruction must be at least 5 characters"}
        req = RefineRequest(
            content_id=content_id,
            original_content=original[:10_000],
            refinement_instruction=instruction[:1000],
        )
        resp = await ai_service.refine_content(request=req, user_id=user_id)
        item = AgentPackItem(kind="variant", title="Refined content", body=resp.refined_content, content_id=resp.content_id)
        state["items"].append(item)
        state["last_draft"] = resp.refined_content
        return {"content_id": resp.content_id, "preview": resp.refined_content[:300]}

    async def _tool_generate_image(self, args: dict, user_id: str, state: dict) -> dict:
        content = (args.get("content") or "").strip()
        image_type = (args.get("image_type") or "social_media").strip()
        if image_type not in ("social_media", "thumbnail"):
            image_type = "social_media"
        if not content:
            return {"error": "content is required"}
        result = await image_service.generate_image(content[:2000], image_type)
        item = AgentPackItem(
            kind="image",
            title="Generated image",
            content_type=image_type,
            image_url=result.get("image_url", ""),
            image_id=result.get("image_id", ""),
        )
        state["items"].append(item)
        return {
            "image_id": result.get("image_id"),
            "image_url": result.get("image_url"),
            "image_type": image_type,
        }

    async def _tool_suggest_hashtags(self, args: dict, user_id: str, state: dict) -> dict:
        industry = args.get("industry") or ""
        city = args.get("city") or ""
        content = (args.get("content") or "").strip()
        llm_tags = await self._llm_hashtags(content, industry, city)
        tags = merge_hashtags(industry=industry, city=city, content=content, llm_tags=llm_tags)
        item = AgentPackItem(kind="hashtags", title="Hashtags", body=" ".join(tags), hashtags=tags)
        state["items"].append(item)
        return {"hashtags": tags}

    async def _tool_make_variants(self, args: dict, user_id: str, state: dict) -> dict:
        content = (args.get("content") or "").strip()
        if not content:
            return {"error": "content is required"}
        try:
            count = int(args.get("count", 2))
        except (TypeError, ValueError):
            count = 2
        count = max(1, min(count, 5))
        variants = await self._llm_variants(content, count)
        for v in variants:
            state["items"].append(AgentPackItem(kind="variant", title="Variant", body=v))
        return {"variants": variants}

    async def _tool_plan_calendar(self, args: dict, user_id: str, state: dict) -> dict:
        try:
            days = int(args.get("days", 7))
        except (TypeError, ValueError):
            days = 7
        days = max(1, min(days, 30))
        topic = (args.get("topic") or "your business").strip()
        content_type = (args.get("content_type") or "post").strip()
        entries = []
        for d in range(1, days + 1):
            body = f"{topic} — planned content for day {d}"
            state["items"].append(AgentPackItem(
                kind="calendar_day", title=f"Day {d}", day=str(d), body=body, content_type=content_type,
            ))
            entries.append({"day": d, "body": body})
        return {"days": days, "topic": topic, "entries": entries}

    async def _tool_list_history(self, args: dict, user_id: str, state: dict) -> dict:
        items, total = get_user_history(user_id, page=1, page_size=10)
        return {
            "history": [
                {
                    "content_id": h.content_id,
                    "business_name": h.business_name,
                    "content_type": h.content_type,
                    "created_at": str(h.created_at),
                }
                for h in items
            ],
            "total": total,
        }

    async def _tool_save_history(self, args: dict, user_id: str, state: dict) -> dict:
        content_id = (args.get("content_id") or "").strip()
        if not content_id:
            return {"error": "content_id is required"}
        ok = update_history(content_id, {"is_saved": True})
        return {"content_id": content_id, "saved": bool(ok)}

    async def _tool_run_quality_check(self, args: dict, user_id: str, state: dict) -> dict:
        content = (args.get("content") or "").strip()
        content_length = args.get("content_length") or "medium"
        return quality_check(content, content_length)


content_agent = ContentAgent()
