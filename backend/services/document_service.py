import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import UploadFile, HTTPException
from loguru import logger

from config import settings
from utils.file_parser import parse_uploaded_file
from utils.text_cleaner import clean_text, chunk_text
from services.rag_service import rag_service
from db.json_store import (
    save_document_metadata,
    get_all_documents,
    get_user_documents,
    get_document_by_id,
    get_document_by_id_and_user,
    delete_document_metadata,
    delete_document_metadata_by_user,
    get_document_categories,
    get_user_document_categories,
)
from db.chroma import delete_document as chroma_delete
from models.document import DocumentUploadResponse, DocumentStatus


class DocumentService:
    def __init__(self):
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    async def process_upload(
        self,
        file: UploadFile,
        title: str,
        category: str,
        tags: str,
        user_id: str,
    ) -> DocumentUploadResponse:
        doc_id = str(uuid.uuid4())

        # Step 1: Validate file
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in settings.allowed_extensions_list:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not allowed. "
                f"Allowed: {', '.join(settings.allowed_extensions_list)}",
            )

        # Step 2: Read file bytes
        file_bytes = await file.read()
        file_size_mb = len(file_bytes) / (1024 * 1024)
        if file_size_mb > settings.MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File too large ({file_size_mb:.1f}MB). "
                f"Maximum: {settings.MAX_FILE_SIZE_MB}MB",
            )

        # Step 3: Save file
        safe_filename = f"{doc_id}{ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        try:
            with open(file_path, "wb") as f:
                f.write(file_bytes)
        except IOError as e:
            logger.error(f"Failed to save file: {e}")
            raise HTTPException(
                status_code=500, detail="Failed to save uploaded file"
            )

        # Step 4: Parse text from file
        parsed_text = parse_uploaded_file(file_bytes, file.filename or "")
        if not parsed_text:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse file content. "
                f"The file may be empty or corrupted.",
            )

        # Step 5: Clean and chunk text
        cleaned_text = clean_text(parsed_text)
        word_count = len(cleaned_text.split())
        chunks = chunk_text(
            cleaned_text,
            chunk_size=500,
            chunk_overlap=50,
        )

        if not chunks:
            raise HTTPException(
                status_code=400,
                detail="No usable content extracted from the file.",
            )

        # Step 6: Index chunks in ChromaDB
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        metadata = {
            "doc_id": doc_id,
            "title": title,
            "category": category,
            "tags": ",".join(tag_list),
            "filename": file.filename or safe_filename,
            "uploaded_by": user_id,
        }

        index_success = rag_service.index_document_chunks(
            doc_id=doc_id,
            chunks=chunks,
            metadata=metadata,
        )

        if not index_success:
            raise HTTPException(
                status_code=500,
                detail="Failed to index document in knowledge base",
            )

        # Step 7: Save document metadata to JSON
        doc_metadata = {
            "doc_id": doc_id,
            "title": title,
            "category": category,
            "tags": tag_list,
            "filename": file.filename or safe_filename,
            "file_path": file_path,
            "file_size_bytes": len(file_bytes),
            "word_count": word_count,
            "chunks_created": len(chunks),
            "status": DocumentStatus.PROCESSED.value,
            "uploaded_by": user_id,
            "created_at": str(datetime.now(timezone.utc)),
            "updated_at": None,
        }
        save_document_metadata(doc_metadata)

        return DocumentUploadResponse(
            doc_id=doc_id,
            title=title,
            category=category,
            chunks_created=len(chunks),
            word_count=word_count,
            status=DocumentStatus.PROCESSED,
            file_size_bytes=len(file_bytes),
            timestamp=datetime.now(timezone.utc),
        )

    def list_documents(self, user_id: str) -> List[dict]:
        return get_user_documents(user_id)

    def get_document(self, doc_id: str, user_id: str) -> Optional[dict]:
        doc = get_document_by_id_and_user(doc_id, user_id)
        if not doc:
            raise HTTPException(
                status_code=403,
                detail=f"Document {doc_id} not found or not accessible",
            )
        return doc

    def delete_document(self, doc_id: str, user_id: str) -> bool:
        doc = get_document_by_id_and_user(doc_id, user_id)
        if not doc:
            raise HTTPException(
                status_code=403,
                detail=f"Document {doc_id} not found or not accessible",
            )

        # Delete from ChromaDB
        chroma_delete(doc_id)

        # Delete file
        if "file_path" in doc and os.path.exists(doc["file_path"]):
            try:
                os.remove(doc["file_path"])
            except OSError as e:
                logger.warning(f"Failed to delete file: {e}")

        # Delete from JSON store
        delete_document_metadata_by_user(doc_id, user_id)
        return True

    def get_categories(self, user_id: str) -> List[dict]:
        return get_user_document_categories(user_id)


document_service = DocumentService()
