import os
import shutil
from typing import Optional, List, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from loguru import logger

from config import settings


_chroma_client: Optional[chromadb.Client] = None
_collection = None


def get_chroma_client() -> chromadb.Client:
    global _chroma_client
    if _chroma_client is None:
        persist_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )
        logger.info(f"ChromaDB client initialized at {persist_dir}")
    return _chroma_client


def get_or_create_collection():
    global _collection
    if _collection is None:
        client = get_chroma_client()
        collection_name = settings.COLLECTION_NAME
        try:
            _collection = client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            count = _collection.count()
            logger.info(
                f"Collection '{collection_name}' ready: {count} documents"
            )
        except Exception as e:
            logger.error(f"Failed to get/create collection: {e}")
            raise
    return _collection


def add_documents(
    ids: List[str],
    embeddings: List[List[float]],
    documents: List[str],
    metadatas: List[Dict[str, Any]],
) -> bool:
    try:
        collection = get_or_create_collection()
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(f"Added {len(ids)} documents to ChromaDB")
        return True
    except Exception as e:
        error_msg = str(e).lower()
        if "dimensionality" in error_msg or "dimension" in error_msg:
            logger.warning(
                f"ChromaDB dimension mismatch detected (likely from embedding model change). "
                f"Automatically resetting collection. Error: {e}"
            )
            reset_collection()
            try:
                collection = get_or_create_collection()
                collection.add(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas,
                )
                logger.info(f"Added {len(ids)} documents to ChromaDB after reset")
                return True
            except Exception as retry_e:
                logger.error(f"Failed to add documents after reset: {retry_e}")
                return False
        logger.error(f"Failed to add documents to ChromaDB: {e}")
        return False


def search_documents(
    query_embedding: List[float],
    top_k: int = 3,
    where_filter: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    try:
        collection = get_or_create_collection()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
        documents_list = []
        if results and results["ids"][0]:
            for i in range(len(results["ids"][0])):
                documents_list.append(
                    {
                        "id": results["ids"][0][i],
                        "document": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i],
                        "distance": results["distances"][0][i]
                        if results["distances"]
                        else 0.0,
                    }
                )
        return documents_list
    except Exception as e:
        logger.error(f"Failed to search ChromaDB: {e}")
        return []


def delete_document(doc_id: str) -> bool:
    try:
        collection = get_or_create_collection()
        collection.delete(where={"doc_id": doc_id})
        logger.info(f"Deleted document {doc_id} from ChromaDB")
        return True
    except Exception as e:
        logger.error(f"Failed to delete from ChromaDB: {e}")
        return False


def count_documents() -> int:
    try:
        collection = get_or_create_collection()
        return collection.count()
    except Exception as e:
        logger.error(f"Failed to count ChromaDB documents: {e}")
        return 0


def reset_collection():
    try:
        client = get_chroma_client()
        client.delete_collection(settings.COLLECTION_NAME)
        global _collection
        _collection = None
        logger.info("ChromaDB collection reset")
        return True
    except Exception as e:
        logger.error(f"Failed to reset ChromaDB collection: {e}")
        return False
