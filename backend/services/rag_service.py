from typing import Any, Dict, List, Optional

from loguru import logger

from config import settings
from services.embedding_service import embedding_service


class RAGService:
    """Retrieval over the user's own knowledge base.

    Every read is scoped to a single ``user_id``. The vector store holds all
    tenants' chunks in one collection, so dropping that filter would surface
    other users' documents in generated content.
    """

    def __init__(self):
        self.top_k = settings.RAG_TOP_K

    def search(
        self,
        query: str,
        user_id: str,
        top_k: Optional[int] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        if not user_id:
            logger.error("RAG search called without user_id — refusing to search")
            return []

        try:
            query_embedding = embedding_service.embed_query(query)
            if query_embedding is None:
                logger.warning("Failed to generate query embedding")
                return []

            if settings.use_postgres:
                from db.vector_store import search_chunks

                return search_chunks(
                    query_embedding=query_embedding,
                    user_id=user_id,
                    top_k=top_k or self.top_k,
                    doc_ids=doc_ids,
                )

            from db.chroma import search_documents

            # ChromaDB stores the owner in chunk metadata, so the same
            # restriction is expressed as a metadata predicate.
            where_filter: Dict[str, Any] = {"uploaded_by": user_id}
            if doc_ids:
                where_filter = {
                    "$and": [
                        {"uploaded_by": user_id},
                        {"doc_id": {"$in": doc_ids}},
                    ]
                }

            return search_documents(
                query_embedding=query_embedding,
                top_k=top_k or self.top_k,
                where_filter=where_filter,
            )

        except Exception as e:
            logger.error(f"RAG search failed: {e}")
            return []

    def index_document_chunks(
        self,
        doc_id: str,
        chunks: List[str],
        metadata: Dict[str, Any],
    ) -> bool:
        try:
            embeddings = embedding_service.embed_texts(chunks)
            if embeddings is None:
                logger.error("Failed to generate embeddings for document chunks")
                return False

            if settings.use_postgres:
                from db.vector_store import add_chunks

                return add_chunks(
                    doc_id=doc_id,
                    user_id=metadata["uploaded_by"],
                    chunks=chunks,
                    embeddings=embeddings,
                    title=metadata.get("title", ""),
                    category=metadata.get("category", "general"),
                )

            from db.chroma import add_documents

            ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [{**metadata, "chunk_index": i} for i in range(len(chunks))]

            return add_documents(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
            )

        except Exception as e:
            logger.error(f"Failed to index document chunks: {e}")
            return False

    def delete_document_chunks(self, doc_id: str) -> bool:
        try:
            if settings.use_postgres:
                from db.vector_store import delete_document_chunks

                return delete_document_chunks(doc_id)

            from db.chroma import delete_document

            return delete_document(doc_id)
        except Exception as e:
            logger.error(f"Failed to delete document chunks: {e}")
            return False

    def get_document_count(self, user_id: Optional[str] = None) -> int:
        """Number of indexed chunks, optionally for one user only."""
        try:
            if settings.use_postgres:
                from db.vector_store import count_chunks

                return count_chunks(user_id)

            from db.chroma import count_documents

            return count_documents()
        except Exception as e:
            logger.error(f"Failed to get document count: {e}")
            return 0


rag_service = RAGService()
