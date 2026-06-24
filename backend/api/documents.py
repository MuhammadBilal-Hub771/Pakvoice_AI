from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from loguru import logger

from models.document import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentDeleteResponse,
    DocumentCategory,
)
from models.user import TokenPayload
from core.dependencies import get_current_user
from services.document_service import document_service

router = APIRouter(prefix="/api/documents", tags=["Knowledge Base"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    summary="Upload a document to knowledge base",
)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("general"),
    tags: str = Form(""),
    current_user: TokenPayload = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    logger.info(
        f"Document upload from {current_user.email}: "
        f"{file.filename} ({file.content_type})"
    )

    response = await document_service.process_upload(
        file=file,
        title=title,
        category=category,
        tags=tags,
        user_id=current_user.sub,
    )

    return response


@router.get(
    "/",
    response_model=List[DocumentResponse],
    summary="List all uploaded documents",
)
async def list_documents(
    current_user: TokenPayload = Depends(get_current_user),
):
    docs = document_service.list_documents(user_id=current_user.sub)
    return [
        DocumentResponse(
            doc_id=d.get("doc_id", ""),
            title=d.get("title", ""),
            category=d.get("category", "general"),
            tags=d.get("tags", []),
            filename=d.get("filename", ""),
            file_size_bytes=d.get("file_size_bytes", 0),
            word_count=d.get("word_count", 0),
            chunks_created=d.get("chunks_created", 0),
            status=d.get("status", "processed"),
            uploaded_by=d.get("uploaded_by", ""),
            created_at=d.get("created_at", ""),
        )
        for d in docs
    ]


@router.get(
    "/categories",
    response_model=List[DocumentCategory],
    summary="Get document categories with counts",
)
async def get_categories(
    current_user: TokenPayload = Depends(get_current_user),
):
    categories = document_service.get_categories(user_id=current_user.sub)
    return [DocumentCategory(**c) for c in categories]


@router.get(
    "/{doc_id}",
    response_model=DocumentResponse,
    summary="Get document details",
)
async def get_document(
    doc_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    doc = document_service.get_document(doc_id, user_id=current_user.sub)
    return DocumentResponse(
        doc_id=doc.get("doc_id", ""),
        title=doc.get("title", ""),
        category=doc.get("category", "general"),
        tags=doc.get("tags", []),
        filename=doc.get("filename", ""),
        file_size_bytes=doc.get("file_size_bytes", 0),
        word_count=doc.get("word_count", 0),
        chunks_created=doc.get("chunks_created", 0),
        status=doc.get("status", "processed"),
        uploaded_by=doc.get("uploaded_by", ""),
        created_at=doc.get("created_at", ""),
    )


@router.delete(
    "/{doc_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete a document from knowledge base",
)
async def delete_document(
    doc_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    success = document_service.delete_document(doc_id, user_id=current_user.sub)
    return DocumentDeleteResponse(
        doc_id=doc_id,
        deleted=success,
        message="Document deleted successfully" if success else "Failed to delete",
    )
