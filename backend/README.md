# ContentPK AI — Backend API

AI-Powered Pakistani Business Content Generator with LangChain and RAG system.

## Tech Stack

- **Python 3.11+** / **FastAPI 0.110+**
- **LangChain 0.2+** / **LangChain-OpenAI** (GPT-3.5-turbo / GPT-4)
- **ChromaDB** (Vector Store for RAG)
- **OpenAI Embeddings** (`text-embedding-3-small`)
- **JWT Auth** (python-jose + passlib/bcrypt)
- **Rate Limiting** (slowapi)
- **Logging** (loguru)

## Features

- **AI Content Generation** — Generate culturally-aware Pakistani business content
- **RAG Pipeline** — Upload documents to a knowledge base for context-aware generation
- **Multi-Language Support** — English, Urdu, Roman Urdu
- **10 Pakistani Industries** — Textile, IT, Agriculture, Manufacturing, E-Commerce, Real Estate, Food & Beverage, Healthcare, Education, Logistics
- **10 Pakistani Cities** — Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Sialkot, Gujranwala
- **7 Content Types** — Social Media, Blog, Product Description, Email Marketing, Press Release, Website Content, Ad Copy
- **5 Tones** — Professional, Casual, Persuasive, Informative, Friendly
- **Admin Dashboard** — User management, content moderation, API analytics
- **JWT Authentication** — Login, Register, Token Refresh, Logout
- **Rate Limiting** — 30 requests/minute by default
- **File Upload** — PDF, DOCX, TXT, MD parsing for knowledge base

## Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── config.py               # Settings via pydantic-settings
├── requirements.txt
├── .env.example
├── api/
│   ├── auth.py             # Login, register, JWT, WhatsApp linking
│   ├── generate.py         # Content generation routes
│   ├── documents.py        # Knowledge base routes
│   ├── history.py          # Generation history routes
│   ├── images.py           # Image generation + gallery
│   ├── stt.py              # Whisper transcription
│   ├── whatsapp.py         # WhatsApp Cloud API webhook
│   ├── agent.py            # Client content agent routes
│   ├── admin.py            # Admin-only routes
│   └── health.py           # Health and readiness checks
├── core/
│   ├── security.py         # JWT, password hashing
│   ├── dependencies.py     # FastAPI dependencies
│   ├── rate_limit.py       # Shared slowapi limiter
│   └── middleware.py       # CORS, rate limit, logging
├── services/
│   ├── ai_service.py       # LangChain + OpenAI logic
│   ├── rag_service.py      # RAG pipeline (pgvector or ChromaDB)
│   ├── document_service.py # File processing
│   ├── embedding_service.py# Vector embeddings
│   ├── history_service.py  # Save/fetch history
│   ├── image_service.py    # GPT Image 2 generation
│   ├── stt_service.py      # OpenAI Whisper
│   ├── storage_service.py  # Supabase Storage or local disk
│   ├── whatsapp_client.py  # Meta Graph API wrapper
│   ├── whatsapp_bot.py     # Bot conversation state machine
│   ├── agent_service.py    # Client content agent (tool-calling loop)
│   ├── agent_validators.py # Deterministic output validators
│   └── web_search.py       # Live web search / page scraping
├── models/                 # Pydantic request/response shapes
├── db/
│   ├── schema.sql          # Supabase bootstrap DDL
│   ├── json_store.py       # Facade: dispatches to one of the two below
│   ├── sql_store.py        # Postgres implementation
│   ├── legacy_json_store.py# JSON file implementation (dev fallback)
│   ├── session.py          # SQLAlchemy engine and sessions
│   ├── models_sql.py       # SQLAlchemy ORM models
│   ├── vector_store.py     # pgvector search and indexing
│   └── chroma.py           # ChromaDB client (dev fallback)
├── alembic/                # Versioned migrations
├── scripts/
│   └── migrate_json_to_supabase.py
├── prompts/
│   ├── pakistani_prompts.py# LangChain prompt templates
│   └── system_prompts.py   # System context prompts
└── utils/
    ├── file_parser.py      # PDF, DOCX, TXT, MD parser
    ├── text_cleaner.py     # Text preprocessing
    └── formatters.py       # Content formatter
```

## Storage backends

The app runs against either of two backends, chosen by whether
`SUPABASE_DB_URL` and the Supabase Storage credentials are set:

| | Development (unset) | Production (set) |
| --- | --- | --- |
| Records | JSON files in `data/` | Supabase Postgres |
| Vectors | ChromaDB | pgvector |
| Files | local disk | Supabase Storage |

The JSON store has no locking and rewrites the whole file per call, so
concurrent writes lose data. It exists so the app runs with zero setup, not for
production. See `docs/DEPLOYMENT.md`.

## Quick Start

### 1. Clone and navigate

```bash
cd backend
```

### 2. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your OpenAI API key and settings
```

Required env vars:
- `OPENAI_API_KEY` — Your OpenAI API key
- `SECRET_KEY` — At least 32 characters for JWT signing

### 5. Run the server

```bash
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Open the API docs

Visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive Swagger UI.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout (blacklist token) |

### Content Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate/content` | Generate business content |
| POST | `/api/generate/refine` | Refine existing content |
| GET | `/api/generate/content-types` | List content types |
| GET | `/api/generate/metadata` | List all metadata options |

### Knowledge Base (Documents)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload document |
| GET | `/api/documents/` | List documents |
| GET | `/api/documents/{doc_id}` | Get document |
| DELETE | `/api/documents/{doc_id}` | Delete document |
| GET | `/api/documents/categories` | Get categories |

### History
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history/` | List generation history |
| GET | `/api/history/{content_id}` | Get history item |
| POST | `/api/history/{content_id}/save` | Save generation |
| DELETE | `/api/history/{content_id}` | Delete history item |
| GET | `/api/history/export/{content_id}` | Export content |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/{user_id}` | Update user |
| DELETE | `/api/admin/users/{user_id}` | Delete user |
| GET | `/api/admin/content` | List all content |
| PATCH | `/api/admin/content/{content_id}/flag` | Flag content |
| GET | `/api/admin/analytics` | Detailed analytics |
| GET | `/api/admin/api-usage` | API usage stats |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/images/generate` | Generate an image with GPT Image 2 |
| POST | `/api/images/save` | Add an image to the gallery |
| GET | `/api/images/gallery` | List saved images |
| DELETE | `/api/images/{image_id}` | Delete a saved image |

### Speech to Text
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stt/transcribe` | Transcribe audio with Whisper |

### WhatsApp
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whatsapp/webhook` | Meta verification handshake |
| POST | `/api/whatsapp/webhook` | Receive messages |
| POST | `/api/auth/whatsapp/link-code` | Issue a one-time linking code |
| GET | `/api/auth/whatsapp/status` | Check link status |
| DELETE | `/api/auth/whatsapp/link` | Unlink the number |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/{user_id}` | Update user |
| DELETE | `/api/admin/users/{user_id}` | Delete user |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/` | Health check |
| GET | `/api/health/ready` | Per-dependency readiness check |

## Default Users

Seeded only when the user store is empty **and** `DEBUG=true`. With `DEBUG`
off, register the first account through `POST /api/auth/register` — shipping
known credentials to a live deployment would hand anyone an admin account.

| Email | Password | Role |
|-------|----------|------|
| `admin@contentpk.ai` | `Admin@123` | Admin |
| `client@contentpk.ai` | `Client@123` | Client |

Registration always creates a client. Admin is granted through the admin panel.

## Environment Variables

Full annotated list in `.env.example`. The ones you cannot skip:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key |
| `SECRET_KEY` | — | JWT signing key |
| `DEBUG` | `false` | Enables demo seeding and OAuth dev auto-login |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins (comma-separated) |
| `FRONTEND_URL` | `http://localhost:3000` | Used for OAuth redirects and bot links |
| `SUPABASE_DB_URL` | — | Postgres URI; empty means JSON file store |
| `SUPABASE_URL` | — | Supabase project URL for Storage |
| `SUPABASE_SERVICE_KEY` | — | `service_role` key; server only |
| `WHATSAPP_ENABLED` | `false` | Turns the bot on |

## License

MIT
