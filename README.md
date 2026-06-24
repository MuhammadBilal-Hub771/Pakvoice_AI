# PakVoice AI — AI-Powered Pakistani Business Content Generator

A full-stack application for generating culturally-relevant business content for the Pakistani market. Features AI-powered content generation with RAG (Retrieval-Augmented Generation), multi-language support (English, Urdu, Roman Urdu), AI image/poster generation, and Pakistani city/industry context awareness.

## Architecture

```
pakistani-business-generator/
├── backend/          # FastAPI Python backend
└── pakvoice-ai/      # Next.js 14 frontend
```

## Tech Stack

### Frontend (`pakvoice-ai/`)
- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS v3** with theme system (green, navy blue, red themes)
- **Zustand** with `persist` middleware for state management
- **TanStack Query v5** for server state & caching
- **Playwright** (via Python backend) for HTML-to-image poster rendering
- **Lucide React** for icons
- **Recharts** for analytics charts

### Backend (`backend/`)
- **FastAPI** (Python 3.12+) with Uvicorn
- **OpenAI** GPT models for content generation & brand detail extraction
- **GPT Image-2** for AI background generation (posters)
- **ChromaDB** for vector storage (RAG)
- **Jinja2** + **Playwright** for social media poster rendering
- **JWT** authentication with Google OAuth support
- **JSON file store** for data persistence

## Features

### Client Portal
- AI content generation across 7 content types (Social Media, Blog, Email, etc.)
- Multi-language support: English, Urdu (اردو), Roman Urdu
- Pakistani city/industry context selection
- RAG-powered knowledge base for context-aware content
- **AI Image Generator** — social media poster & thumbnail creation
- **Image Gallery** — save, view, and download generated images
- Content history with search, filters & "Saved" badges
- Knowledge base document management (upload PDF, DOCX, TXT, MD)
- User-specific data isolation (each user sees only their own data)
- **Google OAuth** login (auto-login in dev mode)

### Admin Portal
- Dashboard with dynamic metrics & activity feed
- User management with delete confirmation
- Content review system
- Analytics with charts (city, industry, language distribution)
- API key management

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.12+
- **OpenAI API key** (for AI content & image generation)
- **Playwright browsers** (auto-installed on first run)

## Quick Start

### 1. Clone & Install Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
python -m playwright install chromium
```

Create `backend/.env` from `.env.example` and set your `OPENAI_API_KEY`.

### 2. Run Backend

```bash
python main.py
# → http://localhost:8000
# Swagger docs: http://localhost:8000/docs
```

### 3. Run Frontend

```bash
cd pakvoice-ai
npm install
npm run dev
# → http://localhost:3000
```

### 4. Login

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@contentpk.ai` | `Admin@123` |
| **Client** | `client@contentpk.ai` | `Client@123` |

Or use **"Continue with Google"** on the login page (dev mode auto-login).

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing secret | (required) |
| `OPENAI_API_KEY` | OpenAI API key | (required) |
| `OPENAI_MODEL` | OpenAI model | `gpt-3.5-turbo` |
| `IMAGE_MODEL` | Image generation model | `gpt-image-2` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (prod) | (empty = dev auto-login) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (empty = dev auto-login) |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

### Frontend (`pakvoice-ai/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Login with email & password |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/google` | GET | Google OAuth login redirect |
| `/api/auth/google/callback` | GET | Google OAuth callback |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/logout` | POST | Logout & blacklist token |

### Content Generation
| Endpoint | Method | Description |
|---|---|---|
| `/api/generate/content/stream` | POST | Generate content (streaming) |
| `/api/generate/refine` | POST | Refine generated content |

### Images
| Endpoint | Method | Description |
|---|---|---|
| `/api/images/generate` | POST | Generate image/poster |
| `/api/images/save` | POST | Save image to gallery |
| `/api/images/gallery` | GET | List user's saved images |
| `/api/images/gallery/{id}` | DELETE | Delete saved image |

### History & Documents
| Endpoint | Method | Description |
|---|---|---|
| `/api/history` | GET | Get generation history |
| `/api/history/stats` | GET | Get user stats |
| `/api/documents/` | GET | List knowledge base documents |
| `/api/documents/upload` | POST | Upload document |
| `/api/documents/{id}` | DELETE | Delete document |

### Admin
| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/stats` | GET | Admin dashboard stats |
| `/api/admin/users` | GET | List users |
| `/api/admin/users/{id}` | DELETE | Delete user |
| `/api/admin/analytics` | GET | Analytics data |

## Project Structure

```
backend/
├── api/               Route handlers (auth, generate, documents, images, admin)
├── core/              Middleware, security, dependencies
├── db/                ChromaDB client, JSON file store
├── models/            Pydantic models
├── prompts/           AI system prompts (English + Urdu)
├── services/          Business logic (AI, RAG, history, documents, image)
├── templates/         Jinja2 HTML templates (poster, thumbnail)
├── data/              JSON data files (users, history, documents)
├── generated_images/  AI-generated images (auto-generated)
├── logs/              Application logs (auto-generated)
├── uploads/           Uploaded documents (auto-generated)
├── chroma_db/         Vector embeddings (auto-generated)
├── main.py            FastAPI entry point
└── config.py          Settings (pydantic)

pakvoice-ai/
├── app/               Next.js pages and layouts
│   ├── (auth)/        Login, Register, OAuth Callback
│   ├── admin/         Admin portal (dashboard, users, analytics, etc.)
│   └── client/        Client portal (home, generate, history, image-generator, etc.)
├── components/        React components
│   ├── ui/            UI primitives (button, input, card, etc.)
│   ├── admin/         Admin-specific components
│   ├── client/        Client-specific components
│   ├── shared/        Shared components (Toast, ConfirmDialog, StatsCard, etc.)
│   └── illustrations/ SVG illustrations & logos
├── hooks/             Custom React hooks (useQueries, useClientStats)
├── lib/               API client, query provider, utilities
├── stores/            Zustand state stores (auth, generate, kb, image)
└── types/             TypeScript type definitions
```

## License

MIT
