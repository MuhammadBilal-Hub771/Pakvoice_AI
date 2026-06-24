from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    SOCIAL_MEDIA = "social_media"
    BLOG_ARTICLE = "blog_article"
    PRODUCT_DESCRIPTION = "product_description"
    EMAIL_MARKETING = "email_marketing"
    PRESS_RELEASE = "press_release"
    WEBSITE_CONTENT = "website_content"
    ADVERTISEMENT_COPY = "advertisement_copy"


class Industry(str, Enum):
    TEXTILE = "textile"
    IT_SOFTWARE = "it_software"
    AGRICULTURE = "agriculture"
    MANUFACTURING = "manufacturing"
    ECOMMERCE = "ecommerce"
    REAL_ESTATE = "real_estate"
    FOOD_BEVERAGE = "food_beverage"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    LOGISTICS = "logistics"


class City(str, Enum):
    KARACHI = "karachi"
    LAHORE = "lahore"
    ISLAMABAD = "islamabad"
    RAWALPINDI = "rawalpindi"
    FAISALABAD = "faisalabad"
    MULTAN = "multan"
    PESHAWAR = "peshawar"
    QUETTA = "quetta"
    SIALKOT = "sialkot"
    GUJRANWALA = "gujranwala"


class Language(str, Enum):
    ENGLISH = "english"
    URDU = "urdu"
    ROMAN_URDU = "roman_urdu"


class Tone(str, Enum):
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    PERSUASIVE = "persuasive"
    INFORMATIVE = "informative"
    FRIENDLY = "friendly"


class ContentLength(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class DocumentSource(BaseModel):
    doc_id: str
    title: str
    category: str
    chunk_text: str
    score: float


class GenerateRequest(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    business_description: str = Field(..., min_length=3, max_length=5000)
    content_type: ContentType
    industry: Industry
    city: City
    language: Language = Language.ENGLISH
    tone: Tone = Tone.PROFESSIONAL
    content_length: ContentLength = ContentLength.MEDIUM
    key_message: str = Field(default="", max_length=500)
    target_audience: str = Field(default="", max_length=500)
    use_knowledge_base: bool = True
    selected_doc_ids: Optional[List[str]] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    content_id: str
    generated_content: str
    content_type: str
    language: str
    sources_used: List[DocumentSource]
    tokens_used: int
    cost_usd: float
    generation_time_ms: int
    timestamp: datetime


class RefineRequest(BaseModel):
    content_id: str
    original_content: str
    refinement_instruction: str = Field(..., min_length=5, max_length=1000)


class RefineResponse(BaseModel):
    content_id: str
    original_content: str
    refined_content: str
    refinement_instruction: str
    tokens_used: int
    timestamp: datetime


class ContentTypeInfo(BaseModel):
    value: str
    label_en: str
    label_ur: str
