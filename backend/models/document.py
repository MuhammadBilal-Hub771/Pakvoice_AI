from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class DocumentUploadResponse(BaseModel):
    doc_id: str
    title: str
    category: str
    chunks_created: int
    word_count: int
    status: DocumentStatus
    file_size_bytes: int
    timestamp: datetime


class DocumentResponse(BaseModel):
    doc_id: str
    title: str
    category: str
    tags: List[str]
    filename: str
    file_size_bytes: int
    word_count: int
    chunks_created: int
    status: DocumentStatus
    uploaded_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class DocumentMetadata(BaseModel):
    doc_id: str
    title: str
    category: str
    tags: List[str]
    filename: str
    file_path: str
    file_size_bytes: int
    word_count: int
    chunks_created: int
    status: DocumentStatus
    uploaded_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class DocumentDeleteResponse(BaseModel):
    doc_id: str
    deleted: bool
    message: str


class DocumentCategory(BaseModel):
    category: str
    count: int
