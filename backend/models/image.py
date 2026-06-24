from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ImageType(str, Enum):
    social_media = "social_media"
    thumbnail = "thumbnail"


class GenerateImageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    image_type: ImageType


class GenerateImageResponse(BaseModel):
    image_id: str
    image_url: str
    image_type: str
    prompt_used: str
    brand_details_extracted: Optional[dict] = None
    generated_at: datetime


class SaveImageRequest(BaseModel):
    image_url: str
    image_type: ImageType
    source_content: str = Field(default="", max_length=2000)


class SavedImage(BaseModel):
    id: str
    user_id: str
    image_url: str
    image_type: str
    source_content: str
    created_at: datetime
