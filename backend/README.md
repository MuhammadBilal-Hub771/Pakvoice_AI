# ContentPK AI — Backend API

AI-Powered Pakistani Business Content Generator with LangChain and RAG system.

## Tech Stack

- **Python 3.11+** / **FastAPI 0.110+**
- **LangChain 0.2+** / **LangChain-OpenAI** (GPT-3.5-turbo / GPT-4)
- **ChromaDB** (Vector Store for RAG)
- **HuggingFace Embeddings** (sentence-transformers)
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
│   ├── auth.py             # Login, register, JWT
│   ├── generate.py         # Content generation routes
│   ├── documents.py        # Knowledge base routes
│   ├── history.py          # Generation history routes
│   ├── admin.py            # Admin-only routes
│   └── health.py           # Health check route
├── core/
│   ├── security.py         # JWT, password hashing
│   ├── dependencies.py     # FastAPI dependencies
│   └── middleware.py       # CORS, rate limit, logging
├── services/
│   ├── ai_service.py       # LangChain + OpenAI logic
│   ├── rag_service.py      # RAG pipeline
│   ├── document_service.py # File processing
│   ├── embedding_service.py# Vector embeddings
│   └── history_service.py  # Save/fetch history
├── models/
│   ├── user.py             # User Pydantic models
│   ├── content.py          # Content request/response
│   ├── document.py         # Document models
│   └── history.py          # History models
├── db/
│   ├── chroma.py           # ChromaDB client setup
│   └── json_store.py       # Simple JSON storage
├── prompts/
│   ├── pakistani_prompts.py# LangChain prompt templates
│   └── system_prompts.py   # System context prompts
└── utils/
    ├── file_parser.py      # PDF, DOCX, TXT, MD parser
    ├── text_cleaner.py     # Text preprocessing
    └── formatters.py       # Content formatter
```

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

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/` | Health check |
| GET | `/api/health/ready` | Readiness check |

## Default Users

| Email | Password | Role |
|-------|----------|------|
| `admin@contentpk.ai` | `Admin@123` | Admin |
| `client@contentpk.ai` | `Client@123` | Client |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | Model to use |
| `SECRET_KEY` | — | JWT signing key (min 32 chars) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token expiry |
| `DEBUG` | `False` | Debug mode |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins (comma-separated) |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage path |
| `UPLOAD_DIR` | `./uploads` | File upload directory |

## License

MIT
