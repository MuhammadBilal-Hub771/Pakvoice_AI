from typing import List, Optional

from openai import OpenAI
from loguru import logger

from config import settings


class EmbeddingService:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _get_client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def embed_text(self, text: str) -> Optional[List[float]]:
        try:
            client = self._get_client()
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to embed text: {e}")
            return None

    def embed_texts(self, texts: List[str]) -> Optional[List[List[float]]]:
        try:
            client = self._get_client()
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=texts,
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"Failed to embed texts: {e}")
            return None

    def embed_query(self, query: str) -> Optional[List[float]]:
        return self.embed_text(query)


embedding_service = EmbeddingService()
