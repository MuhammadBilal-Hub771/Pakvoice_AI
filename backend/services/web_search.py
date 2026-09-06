"""Live web search + page scraping for the client content agent.

Free, no-API-key default: DuckDuckGo HTML search scraped over ``httpx`` and
parsed with BeautifulSoup, with page text extracted from the returned HTML.
If ``SERPER_API_KEY`` or ``TAVILY_API_KEY`` is set, that paid provider is used
for search instead. Every path degrades gracefully: failures return an empty
list or an ``{"error": ...}`` dict rather than raising, so the agent always
gets a clean tool result.
"""

import html
import re
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup
from loguru import logger

from config import settings

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_TIMEOUT = httpx.Timeout(12.0, connect=6.0)
_HTML_PARSER = "html.parser"

_BLOCK_TAGS = [
    "script", "style", "noscript", "svg", "nav", "header", "footer",
    "aside", "form", "iframe", "button",
]


def _clean_text(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def _get(url: str) -> Optional[httpx.Response]:
    try:
        async with httpx.AsyncClient(
            timeout=_TIMEOUT,
            headers={"User-Agent": _UA},
            follow_redirects=True,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp
    except Exception as e:
        logger.warning(f"Web request failed for {url}: {e}")
        return None


def _unwrap_ddg_url(href: str) -> str:
    """DuckDuckGo wraps result links in a /l/?uddg=<encoded-url> redirect."""
    if href.startswith("//"):
        href = "https:" + href
    match = re.search(r"[?&]uddg=([^&]+)", href)
    if match:
        return html.unescape(match.group(1))
    return href


def _parse_ddg_html(text: str, max_results: int) -> List[Dict[str, str]]:
    soup = BeautifulSoup(text, _HTML_PARSER)
    results: List[Dict[str, str]] = []
    for link in soup.select("a.result__a"):
        href = _unwrap_ddg_url(link.get("href") or "")
        title = _clean_text(link.get_text())
        if not title or not href:
            continue
        snippet = ""
        parent = link.find_parent("div", class_="result")
        if parent is not None:
            sn = parent.select_one("a.result__snippet")
            if sn is not None:
                snippet = _clean_text(sn.get_text())
        results.append({"title": title, "url": href, "snippet": snippet})
        if len(results) >= max_results:
            break
    return results


def _parse_ddg_lite(text: str, max_results: int) -> List[Dict[str, str]]:
    soup = BeautifulSoup(text, _HTML_PARSER)
    results: List[Dict[str, str]] = []
    for row in soup.select("tr"):
        link = row.select_one("a.result-link")
        if link is None:
            continue
        href = _unwrap_ddg_url(link.get("href") or "")
        title = _clean_text(link.get_text())
        if not title or not href:
            continue
        snippet_el = row.select_one("td.result-snippet")
        snippet = _clean_text(snippet_el.get_text()) if snippet_el is not None else ""
        results.append({"title": title, "url": href, "snippet": snippet})
        if len(results) >= max_results:
            break
    return results


async def _search_serper(query: str, max_results: int) -> List[Dict[str, str]]:
    url = "https://google.serper.dev/search"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            url,
            json={"q": query, "num": max_results},
            headers={"X-API-KEY": settings.SERPER_API_KEY, "Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
    results: List[Dict[str, str]] = []
    for item in (data.get("organic") or [])[:max_results]:
        results.append({
            "title": _clean_text(item.get("title", "")),
            "url": item.get("link", ""),
            "snippet": _clean_text(item.get("snippet", "")),
        })
    return results


async def _search_tavily(query: str, max_results: int) -> List[Dict[str, str]]:
    url = "https://api.tavily.com/search"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            url,
            json={
                "api_key": settings.TAVILY_API_KEY,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",
            },
        )
        resp.raise_for_status()
        data = resp.json()
    results: List[Dict[str, str]] = []
    for item in (data.get("results") or [])[:max_results]:
        results.append({
            "title": _clean_text(item.get("title", "")),
            "url": item.get("url", ""),
            "snippet": _clean_text(item.get("content", "") or item.get("snippet", "")),
        })
    return results


async def _search_duckduckgo(query: str, max_results: int) -> List[Dict[str, str]]:
    endpoints = (
        (f"https://html.duckduckgo.com/html/?q={quote_plus(query)}", _parse_ddg_html),
        (f"https://lite.duckduckgo.com/lite/?q={quote_plus(query)}", _parse_ddg_lite),
    )
    for url, parser in endpoints:
        resp = await _get(url)
        if resp is None:
            continue
        results = parser(resp.text, max_results)
        if results:
            return results
    return []


async def web_search(query: str, max_results: Optional[int] = None) -> List[Dict[str, str]]:
    """Return up to ``max_results`` results as ``{title, url, snippet}`` dicts."""
    query = (query or "").strip()
    if not query:
        return []
    try:
        max_results = int(max_results or settings.WEB_SEARCH_MAX_RESULTS)
    except (TypeError, ValueError):
        max_results = settings.WEB_SEARCH_MAX_RESULTS
    max_results = max(1, min(max_results, 10))

    try:
        if settings.SERPER_API_KEY:
            return await _search_serper(query, max_results)
        if settings.TAVILY_API_KEY:
            return await _search_tavily(query, max_results)
        return await _search_duckduckgo(query, max_results)
    except Exception as e:
        logger.warning(f"web_search failed for {query!r}: {e}")
        return []


async def scrape_page(url: str, max_chars: Optional[int] = None) -> Dict[str, Any]:
    """Fetch a URL and return ``{title, url, text}`` (truncated) or ``{error}``."""
    url = (url or "").strip()
    if not url:
        return {"error": "url is required"}
    if not re.match(r"^https?://", url, re.IGNORECASE):
        return {"error": "url must start with http(s)"}

    try:
        max_chars = int(max_chars or settings.WEB_SCRAPE_MAX_CHARS)
    except (TypeError, ValueError):
        max_chars = settings.WEB_SCRAPE_MAX_CHARS
    max_chars = max(500, min(max_chars, 20000))

    try:
        resp = await _get(url)
        if resp is None:
            return {"error": f"could not fetch {url}"}

        ctype = resp.headers.get("content-type", "")
        if "html" not in ctype and "text" not in ctype:
            return {"error": f"unsupported content type: {ctype or 'unknown'}"}

        soup = BeautifulSoup(resp.text, _HTML_PARSER)
        for tag in soup(_BLOCK_TAGS):
            tag.decompose()

        title = ""
        if soup.title and soup.title.string:
            title = _clean_text(soup.title.string)
        if not title:
            h1 = soup.find("h1")
            if h1 is not None:
                title = _clean_text(h1.get_text())

        paragraphs = [_clean_text(p.get_text()) for p in soup.find_all("p")]
        text = "\n\n".join(p for p in paragraphs if len(p) > 20)
        if not text and soup.body is not None:
            text = _clean_text(soup.body.get_text())

        if len(text) > max_chars:
            text = text[:max_chars].rstrip() + "…"
        return {"title": title, "url": url, "text": text}
    except Exception as e:
        logger.warning(f"scrape_page failed for {url}: {e}")
        return {"error": f"scrape failed: {str(e)}"}
