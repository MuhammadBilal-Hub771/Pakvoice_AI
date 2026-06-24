from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ContentPK API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # AI - OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    AI_TEMPERATURE: float = 0.7
    AI_MAX_TOKENS: int = 1500

    # RAG
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    COLLECTION_NAME: str = "contentpk_kb"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    RAG_TOP_K: int = 3

    # Image Generation (GPT Image 2)
    IMAGE_MODEL: str = "gpt-image-2"
    IMAGE_SIZE: str = "1024x1024"
    IMAGE_QUALITY: str = "high"
    IMAGE_STORAGE_DIR: str = "./generated_images"

    # Files
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = ".txt,.md,.pdf,.docx"

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]

    # Rate Limiting
    RATE_LIMIT: str = "30/minute"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
