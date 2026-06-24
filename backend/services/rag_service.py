from typing import List, Optional, Dict, Any

from loguru import logger

from config import settings
from db.chroma import search_documents, add_documents, count_documents
from services.embedding_service import embedding_service


class RAGService:
    def __init__(self):
        self.top_k = settings.RAG_TOP_K

    def search(
        self,
        query: str,
        top_k: Optional[int] = None,
        doc_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        try:
            query_embedding = embedding_service.embed_query(query)
            if query_embedding is None:
                logger.warning("Failed to generate query embedding")
                return []

            where_filter = None
            if doc_ids:
                where_filter = {"doc_id": {"$in": doc_ids}}

            results = search_documents(
                query_embedding=query_embedding,
                top_k=top_k or self.top_k,
                where_filter=where_filter,
            )

            return results

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

            ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [
                {**metadata, "chunk_index": i} for i in range(len(chunks))
            ]

            success = add_documents(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
            )

            return success

        except Exception as e:
            logger.error(f"Failed to index document chunks: {e}")
            return False

    def get_document_count(self) -> int:
        try:
            return count_documents()
        except Exception as e:
            logger.error(f"Failed to get document count: {e}")
            return 0


rag_service = RAGService()
