"""pgvector-backed vector store, replacing ChromaDB when Postgres is active.

Returns the same result shape as ``db/chroma.py`` (``id``, ``document``,
``metadata``, ``distance``) so ``services/rag_service.py`` and
``services/ai_service.py`` treat the two interchangeably.

The important difference from ChromaDB is that ``search_chunks`` requires a
``user_id`` and filters on it in SQL. Chunks are stored in one shared table, and
this predicate is what keeps one tenant's documents out of another's retrieval
results.
"""

from typing import Any, Dict, List, Optional

from loguru import logger
from sqlalchemy import delete, func, select

from db.models_sql import DocumentChunkRow
from db.session import db_session


def add_chunks(
    doc_id: str,
    user_id: str,
    chunks: List[str],
    embeddings: List[List[float]],
    title: str = "",
    category: str = "general",
) -> bool:
    if len(chunks) != len(embeddings):
        logger.error(
            f"Chunk/embedding count mismatch for {doc_id}: "
            f"{len(chunks)} chunks vs {len(embeddings)} embeddings"
        )
        return False

    try:
        with db_session() as s:
            # Re-indexing the same document should replace, not duplicate.
            s.execute(
                delete(DocumentChunkRow).where(DocumentChunkRow.doc_id == str(doc_id))
            )
            s.add_all(
                [
                    DocumentChunkRow(
                        doc_id=str(doc_id),
                        user_id=str(user_id),
                        chunk_index=i,
                        content=chunk,
                        title=title,
                        category=category,
                        embedding=embedding,
                    )
                    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
                ]
            )
        logger.info(f"Indexed {len(chunks)} chunks for document {doc_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to index chunks for {doc_id}: {e}")
        return False


def search_chunks(
    query_embedding: List[float],
    user_id: str,
    top_k: int = 3,
    doc_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    if not user_id:
        # Refusing beats silently searching every tenant's documents.
        logger.error("search_chunks called without user_id — returning no results")
        return []

    try:
        distance = DocumentChunkRow.embedding.cosine_distance(query_embedding)
        stmt = (
            select(DocumentChunkRow, distance.label("distance"))
            .where(
                DocumentChunkRow.user_id == str(user_id),
                DocumentChunkRow.embedding.is_not(None),
            )
            .order_by(distance)
            .limit(top_k)
        )
        if doc_ids:
            stmt = stmt.where(DocumentChunkRow.doc_id.in_([str(d) for d in doc_ids]))

        with db_session() as s:
            rows = s.execute(stmt).all()

        return [
            {
                "id": f"{row.DocumentChunkRow.doc_id}_chunk_"
                f"{row.DocumentChunkRow.chunk_index}",
                "document": row.DocumentChunkRow.content,
                "metadata": {
                    "doc_id": str(row.DocumentChunkRow.doc_id),
                    "title": row.DocumentChunkRow.title,
                    "category": row.DocumentChunkRow.category,
                    "uploaded_by": str(row.DocumentChunkRow.user_id),
                    "chunk_index": row.DocumentChunkRow.chunk_index,
                },
                "distance": float(row.distance),
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"pgvector search failed: {e}")
        return []


def delete_document_chunks(doc_id: str) -> bool:
    try:
        with db_session() as s:
            s.execute(
                delete(DocumentChunkRow).where(DocumentChunkRow.doc_id == str(doc_id))
            )
        return True
    except Exception as e:
        logger.error(f"Failed to delete chunks for {doc_id}: {e}")
        return False


def count_chunks(user_id: Optional[str] = None) -> int:
    try:
        stmt = select(func.count()).select_from(DocumentChunkRow)
        if user_id:
            stmt = stmt.where(DocumentChunkRow.user_id == str(user_id))
        with db_session() as s:
            return s.scalar(stmt) or 0
    except Exception as e:
        logger.error(f"Failed to count chunks: {e}")
        return 0
