from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PakVoice API"
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

    # Database (Supabase Postgres)
    # Leave empty to keep using the local JSON file store. Once set, the
    # backend reads and writes Postgres instead.
    SUPABASE_DB_URL: Optional[str] = None
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE_SECONDS: int = 1800

    @property
    def use_postgres(self) -> bool:
        return bool(self.SUPABASE_DB_URL and self.SUPABASE_DB_URL.strip())

    # Supabase Storage
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    SUPABASE_DOCUMENTS_BUCKET: str = "documents"
    SUPABASE_IMAGES_BUCKET: str = "images"
    SIGNED_URL_TTL_SECONDS: int = 604800  # 7 days

    @property
    def use_supabase_storage(self) -> bool:
        return bool(
            self.SUPABASE_URL
            and self.SUPABASE_URL.strip()
            and self.SUPABASE_SERVICE_KEY
            and self.SUPABASE_SERVICE_KEY.strip()
        )

    # RAG
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    COLLECTION_NAME: str = "contentpk_kb"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    RAG_TOP_K: int = 3

    # Image Generation (GPT Image 2)
    IMAGE_MODEL: str = "gpt-image-2"
    IMAGE_SIZE: str = "1024x1024"
    IMAGE_QUALITY: str = "high"
    IMAGE_STORAGE_DIR: str = "./generated_images"

    # STT (OpenAI Whisper)
    WHISPER_MODEL: str = "whisper-1"
    WHISPER_MAX_FILE_MB: int = 25

    # Client Content Agent (tool-calling loop, client accounts only)
    AGENT_MODEL: str = ""
    AGENT_MAX_STEPS: int = 12
    AGENT_REQUIRE_VALIDATION: bool = True
    # Hard cap on quality-check refine/re-search cycles per run.
    AGENT_MAX_REFINE_ITERATIONS: int = 3

    @property
    def agent_model(self) -> str:
        return (self.AGENT_MODEL or "").strip() or self.OPENAI_MODEL

    # Web search (live) for the content agent
    WEB_SEARCH_ENABLED: bool = True
    WEB_SEARCH_MAX_RESULTS: int = 5
    WEB_SCRAPE_MAX_CHARS: int = 6000
    # Optional paid providers. Leave empty to use the free DuckDuckGo fallback.
    SERPER_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None

    # WhatsApp Cloud API (Meta)
    WHATSAPP_ENABLED: bool = False
    WHATSAPP_API_VERSION: str = "v21.0"
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    # Human-readable number shown in the UI ("message us on +92...").
    # Distinct from the phone number ID, which is an opaque Meta identifier.
    WHATSAPP_DISPLAY_NUMBER: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None
    WHATSAPP_APP_SECRET: Optional[str] = None
    # Per-phone throttle, applied in the bot rather than by slowapi, because
    # every webhook request arrives from Meta's IPs and would share one bucket.
    WHATSAPP_MAX_MESSAGES_PER_MINUTE: int = 10
    WHATSAPP_LINK_CODE_TTL_MINUTES: int = 15

    @property
    def whatsapp_configured(self) -> bool:
        return bool(
            self.WHATSAPP_ENABLED
            and self.WHATSAPP_PHONE_NUMBER_ID
            and self.WHATSAPP_ACCESS_TOKEN
            and self.WHATSAPP_VERIFY_TOKEN
            and self.WHATSAPP_APP_SECRET
        )

    # Files
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = ".txt,.md,.pdf,.docx"

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]

    # Rate Limiting
    RATE_LIMIT: str = "30/minute"
    RATE_LIMIT_GENERATE: str = "10/minute"
    RATE_LIMIT_IMAGE: str = "5/minute"
    RATE_LIMIT_STT: str = "15/minute"
    RATE_LIMIT_AGENT: str = "8/minute"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Frontend base URL, used for OAuth redirects and WhatsApp deep links
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
