"""Deterministic, LLM-free validators and hashtag lexicon for the content agent.

Everything here is pure Python: no network, no model. The agent calls these
after the tool loop to gate the final ``CampaignPack`` and to merge a consistent
set of Pakistani hashtags. Keeping them LLM-free makes validation reproducible
and cheap, and means a failed validation can never be blamed on model drift.
"""

import re
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Hashtag lexicon (static)
# ---------------------------------------------------------------------------

PK_CITY_TAGS: Dict[str, str] = {
    "karachi": "#Karachi",
    "lahore": "#Lahore",
    "islamabad": "#Islamabad",
    "rawalpindi": "#Rawalpindi",
    "faisalabad": "#Faisalabad",
    "multan": "#Multan",
    "peshawar": "#Peshawar",
    "quetta": "#Quetta",
    "sialkot": "#Sialkot",
    "gujranwala": "#Gujranwala",
}

# Always-present national tags, plus per-industry boosters.
STATIC_PK_TAGS = ["#Karachi", "#Lahore", "#Islamabad", "#MadeInPakistan"]

INDUSTRY_TAGS: Dict[str, List[str]] = {
    "textile": ["#Textile", "#FashionPK", "#PakistanTextile"],
    "it_software": ["#TechPK", "#Software", "#ITPakistan"],
    "agriculture": ["#Agriculture", "#FarmPK", "#PakistanAgriculture"],
    "manufacturing": ["#Manufacturing", "#PakistaniBrands"],
    "ecommerce": ["#Ecommerce", "#OnlineShopping", "#ShopPK"],
    "real_estate": ["#RealEstate", "#PropertyPK", "#PakistanRealEstate"],
    "food_beverage": ["#FoodPK", "#Restaurant", "#FoodiePakistan"],
    "healthcare": ["#Healthcare", "#HealthPK", "#PakistanHealthcare"],
    "education": ["#Education", "#EdTechPK", "#LearnPK"],
    "logistics": ["#Logistics", "#ShippingPK", "#PakistanLogistics"],
}

# Length bands (word counts) keyed by the ContentLength enum values.
LENGTH_BANDS: Dict[str, tuple] = {
    "short": (10, 60),
    "medium": (60, 200),
    "long": (200, 5000),
}

# Broad, case-insensitive sensitive-phrase flags. Deliberately coarse: the
# validator only needs to catch obviously problematic copy before it ships.
SENSITIVE_PHRASES = [
    "guaranteed results", "100% guaranteed", "miracle cure", "cure for",
    "get rich quick", "earn money fast", "no effort", "free money",
    "double your money", "guaranteed profit",
]

# Cultural-context keywords that a Pakistani campaign should nod to.
FESTIVAL_KEYWORDS = ["eid", "ramadan", "ramzan", "14 aug", "14 august", "independence day", "defence day", "6 sep"]

_ARABIC_SCRIPT_RE = re.compile(r"[\u0600-\u06FF]")
# Roman-Urdu markers that rarely appear together in plain English copy.
_ROMAN_URDU_MARKERS = [
    "aur", "hai", "mein", "nahi", "ye", "kia", "ka", "ki", "hota", "abhi",
    "bohat", "bhi", "karo", "sab", "ap", "hum", "aap", "shukriya", "mubarak",
]


def detect_language_script(text: str) -> str:
    """Return "urdu" (Arabic script), "roman_urdu", or "english"."""
    if not text:
        return "english"
    if _ARABIC_SCRIPT_RE.search(text):
        return "urdu"
    lower = text.lower()
    tokens = re.findall(r"[a-z]+", lower)
    if not tokens:
        return "english"
    hits = sum(1 for m in _ROMAN_URDU_MARKERS if m in tokens)
    return "roman_urdu" if hits >= 2 else "english"


def _word_count(text: str) -> int:
    return len(text.split()) if text else 0


def length_check(text: str, content_length: str = "medium") -> dict:
    """Word-count band check against the requested length."""
    count = _word_count(text)
    lo, hi = LENGTH_BANDS.get(content_length, LENGTH_BANDS["medium"])
    passed = lo <= count <= hi
    return {
        "name": "length",
        "passed": passed,
        "message": (
            f"{count} words ({content_length} band {lo}-{hi})"
            if passed
            else f"{count} words — outside {content_length} band ({lo}-{hi})"
        ),
    }


def language_check(text: str) -> dict:
    """Non-LLM script heuristic: Urdu script vs Roman Urdu vs English."""
    script = detect_language_script(text)
    # Any of the three is acceptable — this check only flags empty/garbled text.
    passed = bool(text.strip())
    return {
        "name": "language",
        "passed": passed,
        "message": f"detected {script.replace('_', ' ')} script",
    }


def sensitivity_check(text: str) -> dict:
    """Flag banned/sensitive phrases in the copy."""
    lower = text.lower()
    hits = [p for p in SENSITIVE_PHRASES if p in lower]
    passed = not hits
    return {
        "name": "sensitivity",
        "passed": passed,
        "message": (
            "no sensitive phrases"
            if passed
            else f"found sensitive phrase(s): {', '.join(hits)}"
        ),
    }


def citation_check(items: List[dict], use_kb: bool, citations: List[dict]) -> dict:
    """When the KB is used, at least one produced item must carry a source."""
    if not use_kb:
        return {"name": "citations", "passed": True, "message": "knowledge base not required"}
    cited = any(item.get("sources") for item in items) or bool(citations)
    return {
        "name": "citations",
        "passed": cited,
        "message": (
            f"{len(citations)} citation(s) collected"
            if cited
            else "no citations — KB was requested but nothing was cited"
        ),
    }


def cultural_check(items: List[dict]) -> dict:
    """Heuristic: campaign mentions a city/industry and a cultural anchor."""
    blob = " ".join(
        [str(item.get("body", "")) + " " + str(item.get("title", "")) for item in items]
    ).lower()

    city_keys = list(PK_CITY_TAGS.keys())
    industry_keys = list(INDUSTRY_TAGS.keys())
    has_city_or_industry = any(k in blob for k in city_keys + industry_keys)
    has_festival = any(k in blob for k in FESTIVAL_KEYWORDS)

    passed = has_city_or_industry and has_festival
    return {
        "name": "cultural",
        "passed": passed,
        "message": (
            "city/industry + festival context present"
            if passed
            else "missing cultural context (city/industry or festival keyword)"
        ),
    }


def merge_hashtags(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    content: str = "",
    llm_tags: Optional[List[str]] = None,
) -> List[str]:
    """Merge static Pakistani tags, industry tags, a city tag, and optional LLM tags.

    Dedup is case-insensitive; order is stable (static first, then industry,
    then city, then any LLM extras).
    """
    tags: List[str] = list(STATIC_PK_TAGS)
    industry = (industry or "").lower()
    city = (city or "").lower()

    for t in INDUSTRY_TAGS.get(industry, []):
        tags.append(t)
    if city in PK_CITY_TAGS:
        tags.append(PK_CITY_TAGS[city])
    for t in llm_tags or []:
        tags.append(t)

    seen = set()
    deduped: List[str] = []
    for t in tags:
        key = t.lstrip("#").lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(t if t.startswith("#") else f"#{t}")
    return deduped


def quality_check(text: str, content_length: str = "medium") -> dict:
    """Run the four text checks on a single piece of copy."""
    checks = [
        length_check(text, content_length),
        language_check(text),
        sensitivity_check(text),
    ]
    return {
        "passed": all(c["passed"] for c in checks),
        "checks": checks,
    }


def validate_pack(
    items: List[dict],
    citations: List[dict],
    use_knowledge_base: bool,
) -> dict:
    """Full validation gate for a completed campaign pack."""
    checks: List[dict] = []
    for item in items:
        body = item.get("body", "")
        if body:
            checks.append(length_check(body, item.get("content_type") or "medium"))
            checks.append(language_check(body))
            checks.append(sensitivity_check(body))
    checks.append(citation_check(items, use_knowledge_base, citations))
    checks.append(cultural_check(items))

    return {
        "passed": all(c["passed"] for c in checks),
        "checks": checks,
    }
