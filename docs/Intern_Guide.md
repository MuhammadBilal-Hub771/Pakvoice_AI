# 📘 Pakvoice AI (ContentPK AI) — Complete Project Documentation
> **Target Audience:** Intern Level / Junior Engineers  
> **Project Overview:** AI-Powered Pakistani Business Content & Image Generation Platform with RAG (Retrieval-Augmented Generation).

---

## 📑 Table of Contents
1. [Introduction & High-Level Architecture](#1-introduction--high-level-architecture)
2. [Tech Stack & Languages](#2-tech-stack--languages)
3. [Libraries & Dependencies](#3-libraries--dependencies)
   - [Frontend Dependencies](#frontend-dependencies)
   - [Backend Dependencies](#backend-dependencies)
4. [React & Custom Hooks Guide](#4-react--custom-hooks-guide)
   - [Built-in React & Next.js Hooks](#built-in-react--nextjs-hooks)
   - [TanStack Query (React Query) Hooks](#tanstack-query-react-query-hooks)
   - [Zustand State Store Hooks](#zustand-state-store-hooks)
5. [APIs & Communication Architecture](#5-apis--communication-architecture)
   - [How Frontend Calls Backend APIs](#how-frontend-calls-backend-apis)
   - [All Backend API Endpoints](#all-backend-api-endpoints)
   - [External APIs Used](#external-apis-used)
6. [Core System Functionalities & Workflows](#6-core-system-functionalities--workflows)
   - [1. User Authentication & Authorization](#1-user-authentication--authorization)
   - [2. AI Content Generation & Streaming](#2-ai-content-generation--streaming)
   - [3. RAG Knowledge Base (Document Search)](#3-rag-knowledge-base-document-search)
   - [4. Visual Image Generation & Gallery](#4-visual-image-generation--gallery)
   - [5. Admin Dashboard & System Analytics](#5-admin-dashboard--system-analytics)
7. [Directory Structure & Summary](#7-directory-structure--summary)

---

## 1. Introduction & High-Level Architecture

**Pakvoice AI** (also referenced as **ContentPK AI**) is a full-stack web application tailored for Pakistani businesses. It allows users (clients) to generate localized, culturally tuned business content (social media posts, blogs, marketing emails, product descriptions) in English, Urdu, Roman Urdu, Sindhi, Pashto, and Punjabi across key cities (Karachi, Lahore, Islamabad, etc.) and industries (Textile, Agriculture, IT, Real Estate, etc.).

### System Architecture Flow:
```
[ User Browser ]
       │
       ▼ (HTTPS / JSON API requests with JWT Bearer Token)
[ Next.js Frontend (Port 3000) ]
  ├── App Router (Pages & Views)
  ├── Zustand Stores (Global UI State & Auth)
  └── TanStack React Query (Server Data Fetching & Caching)
       │
       ▼
[ FastAPI Backend (Port 8001) ]
  ├── JWT Auth & Security Middleware
  ├── AI Service (OpenAI LLM Integration)
  ├── RAG Service (ChromaDB Vector Store)
  ├── Image Service (GPT Image 2 & File Storage)
  └── JSON Database / Persistence Store
       │
       ├──► OpenAI API (gpt-4o-mini & image generation)
       ├──► ChromaDB (Vector database for PDF/DOCX embeddings)
       └──► Local Filesystem (/static/images for image gallery, /uploads for docs)
```

---

## 2. Tech Stack & Languages

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) | React-based SSR/SSG full-stack framework |
| **Frontend Language** | TypeScript / JavaScript | Strongly typed JavaScript for browser components |
| **Styling** | Tailwind CSS + Radix UI | Utility-first CSS with accessible unstyled components |
| **Backend Framework** | FastAPI 0.110+ | Asynchronous high-performance Python web framework |
| **Backend Language** | Python 3.10+ | Primary language for AI orchestration, data parsing & REST APIs |
| **Database & Vector DB** | ChromaDB + JSON Store | Embedded vector database for RAG & file-backed persistent JSON store |
| **AI Models** | OpenAI `gpt-4o-mini`, `gpt-image-2` | LLM for localized content & image generation |

---

## 3. Libraries & Dependencies

### Frontend Dependencies (`frontend/package.json`)

#### Core UI & Framework
* **`next` (v14.1.4) & `react` (v18.2.0)**: The core framework for rendering pages, routing, and user interface lifecycle.
* **`lucide-react`**: Vector icons used across sidebars, buttons, and status indicators.
* **`recharts`**: Interactive analytics charts used in Admin dashboards (bar charts, area charts, pie charts).

#### UI Components & Styling
* **`@radix-ui/react-*`** (`accordion`, `avatar`, `checkbox`, `dialog`, `dropdown-menu`, `select`, `tabs`, `toast`, `tooltip`, etc.): Headless accessible component primitives.
* **`tailwind-merge` & `clsx` & `class-variance-authority`**: Utility helpers for conditional CSS class merging in Tailwind.

#### State Management & Data Fetching
* **`@tanstack/react-query`**: Manages asynchronous server data fetching, automatic background revalidation, caching, and loading/error states.
* **`zustand`**: Light-weight, boilerplate-free state management library used for managing application state across components.

#### Forms & Validation
* **`react-hook-form` & `zod` & `@hookform/resolvers`**: High-performance form handling with strict schema validation.

---

### Backend Dependencies (`backend/requirements.txt`)

#### API Framework & Server
* **`fastapi`**: Async Python Web Framework for building REST APIs.
* **`uvicorn[standard]`**: High-performance ASGI server for hosting FastAPI.
* **`pydantic` & `pydantic-settings`**: Data parsing, strict validation schemas, and environment config handling.

#### AI & RAG Libraries
* **`openai`**: Official Python client for invoking OpenAI models (`gpt-4o-mini`).
* **`langchain`, `langchain-openai`, `langchain-community`**: Framework for building LLM applications, prompt templates, and vector store retrieval chains.
* **`chromadb`**: Vector store used to store document chunks and perform semantic similarity search for RAG.
* **`pymupdf` (fitz) & `python-docx`**: Extract text from PDF documents and Microsoft Word `.docx` files uploaded by users.

#### Security & Utilities
* **`python-jose[cryptography]`**: Encodes and decodes JSON Web Tokens (JWT) for secure user authentication.
* **`passlib[bcrypt]`**: Safely hashes passwords using bcrypt algorithm.
* **`slowapi`**: Rate-limiting library to protect API endpoints against spam/abuse.
* **`loguru`**: Structured, colored logger for backend activity tracking.
* **`httpx` & `aiofiles`**: Async HTTP requests and asynchronous local file handling.

---

## 4. React & Custom Hooks Guide

Hooks are special functions in React that allow components to use state, lifecycle methods, and store management.

### Built-in React & Next.js Hooks

1. **`useState`**: Manages local state within a single component (e.g., `const [text, setText] = useState('')`).
2. **`useEffect`**: Triggers side effects when a component mounts or dependent values change (e.g., loading user profile on page load).
3. **`useRouter` (from `next/navigation`)**: Programmatically navigates users (e.g., `router.push('/client/dashboard')`).
4. **`usePathname` (from `next/navigation`)**: Reads the active route path to highlight navigation links.

---

### TanStack Query (React Query) Hooks (`frontend/hooks/useQueries.ts`)

These custom hooks wrap API calls to provide automatic loading flags (`isLoading`), error messages (`error`), and data caching.

| Custom Hook Name | Type | Description |
| :--- | :--- | :--- |
| **`useLogin()`** | `useMutation` | Calls `/api/auth/login`, saves JWT token, updates `authStore`. |
| **`useRegister()`** | `useMutation` | Calls `/api/auth/register`, registers client, updates auth state. |
| **`useGenerateContent()`** | `useMutation` | Submits form to `/api/generate/content`, streams/stores output. |
| **`useRefineContent()`** | `useMutation` | Sends refinement instructions to modify an existing text output. |
| **`useHistory()`** | `useQuery` | Fetches saved generation history for the logged-in user. |
| **`useDeleteHistory()`** | `useMutation` | Deletes a specific generated content entry by ID. |
| **`useDocuments()`** | `useQuery` | Fetches knowledge base documents uploaded by the user. |
| **`useUploadDocument()`** | `useMutation` | Uploads PDF/DOCX file to `/api/documents/upload`. |
| **`useDeleteDocument()`** | `useMutation` | Removes document from ChromaDB vector store and disk. |
| **`useAdminStats()`** | `useQuery` | Fetches overall platform metrics for admin dashboard. |
| **`useAdminUsers()`** | `useQuery` | Fetches user list with pagination & filters. |
| **`useAdminContent()`** | `useQuery` | Fetches all platform-generated content for moderation. |

---

### Zustand State Store Hooks (`frontend/stores/*`)

Zustand stores maintain central application state without passing props down multiple levels.

1. **`useAuthStore`** (`frontend/stores/authStore.ts`):
   - Stores `user` object and JWT `token`.
   - Persists state in `localStorage` (`pakvoice-auth`).
   - Methods: `login(user, token)`, `logout()`, `updateUser(data)`.
2. **`useGenerateStore`** (`frontend/stores/generateStore.ts`):
   - Stores input form state and current `generatedContent`.
   - Methods: `setGeneratedContent()`, `setIsLoading()`, `addToHistory()`.
3. **`useKBStore`** (`frontend/stores/kbStore.ts`):
   - Manages Knowledge Base documents and upload state (`isUploading`).
4. **`useImageStore`** (`frontend/stores/imageStore.ts`):
   - Manages generated image gallery state and active filters.
5. **`useAdminStore`** (`frontend/stores/adminStore.ts`):
   - Manages admin users list, platform metrics, and selected filters.
6. **`useUIStore`** (`frontend/stores/uiStore.ts`):
   - Manages global toast notifications (`addNotification`), theme settings, and sidebar open state.

---

## 5. APIs & Communication Architecture

### How Frontend Calls Backend APIs (`frontend/lib/api.ts`)

1. **Centralized Fetch Function (`fetchApi`)**:
   - Automatically attaches the `Authorization: Bearer <token>` header if a token exists in `localStorage`.
   - Handles standard Content-Type (`application/json`) except when submitting files via `FormData`.
   - Automatically detects expired sessions (`HTTP 401 / 403`), clears tokens, and redirects the user to `/login`.

2. **Data Model Mapping (CamelCase ↔ Snake_case)**:
   - Backend Python uses `snake_case` (e.g. `business_name`, `created_at`).
   - Frontend TypeScript uses `camelCase` (e.g. `businessName`, `createdAt`).
   - Mappers (`mapUserFromBackend`, `mapContentFromBackend`, `mapDocumentFromBackend`) bridge this gap seamlessly.

---

### All Backend API Endpoints (`backend/api/*`)

#### 🔐 Authentication Endpoints (`/api/auth`)
* `POST /api/auth/login`: Authenticates user by email, password & role; returns JWT access token.
* `POST /api/auth/register`: Creates new client user account with city & industry fields.
* `GET /api/auth/me`: Returns details of current authenticated user.
* `POST /api/auth/logout`: Clears authentication session.

#### 🪄 Generation Endpoints (`/api/generate`)
* `POST /api/generate/content`: Generates business content based on topic, city, tone, language, and RAG options.
* `POST /api/generate/content/stream`: Streams generated text chunk-by-chunk using Server-Sent Events (SSE) / ReadableStream.
* `POST /api/generate/refine`: Modifies existing generated text using follow-up prompt instructions.

#### 📁 Knowledge Base / Documents Endpoints (`/api/documents`)
* `GET /api/documents/`: Lists all knowledge base documents for current user.
* `POST /api/documents/upload`: Uploads PDF/DOCX/TXT/MD, extracts text, generates vector embeddings in ChromaDB.
* `DELETE /api/documents/{id}`: Deletes document record and removes vector embeddings from ChromaDB.

#### 📜 Generation History Endpoints (`/api/history`)
* `GET /api/history`: Lists user's past generations with filtering by language, city, industry.
* `GET /api/history/{id}`: Retrieves single generation record.
* `DELETE /api/history/{id}`: Removes generation from history.
* `POST /api/history/{id}/save`: Bookmarks/saves a generation.

#### 🖼️ Image Generation Endpoints (`/api/images`)
* `POST /api/images/generate`: Generates image using OpenAI `gpt-image-2` based on text context (falls back to SVG placeholder if offline).
* `POST /api/images/save`: Downloads remote image URL and permanently saves file to local disk (`/static/images/{id}.png`).
* `GET /api/images/gallery`: Lists saved images for the logged-in user.
* `DELETE /api/images/{id}`: Removes saved image record and deletes image file from disk.

#### 🛠️ Admin Endpoints (`/api/admin`)
* `GET /api/admin/stats`: Aggregate system metrics (users, generations, documents, API usage).
* `GET /api/admin/users`: List registered users.
* `PATCH /api/admin/users/{id}`: Update user status (Active / Suspended).
* `DELETE /api/admin/users/{id}`: Delete user account.
* `GET /api/admin/content`: List all generated content across platform for moderation.
* `PATCH /api/admin/content/{id}/flag`: Flag inappropriate content.
* `GET /api/admin/analytics`: Analytics data (city breakdown, industry breakdown, language distribution).

---

### External APIs Used

1. **OpenAI API**:
   - `gpt-4o-mini`: Fast, cost-effective LLM used for generating localized Pakistani content in English, Urdu, Roman Urdu, Sindhi, Pashto, Punjabi.
   - `gpt-image-2` / DALL-E endpoint: Generates promotional images based on content prompts.
2. **ChromaDB Native Vector API**:
   - Local vector search database for document retrieval in RAG pipeline.

---

## 6. Core System Functionalities & Workflows

### 1. User Authentication & Authorization
- **Workflow**: Users log in or register on frontend `app/(auth)/login` or `app/(auth)/register`.
- **JWT Token**: Backend issues JWT token with 24-hour expiration containing `sub` (User ID), `role` (`client` or `admin`), and `email`.
- **Route Middleware**: Frontend `middleware.ts` inspects cookies/tokens to prevent unauthenticated users from accessing `/client/*` or `/admin/*` routes.

---

### 2. AI Content Generation & Streaming
1. User enters business name, city (e.g. Lahore), industry (e.g. Textile), language (e.g. Roman Urdu), and target audience.
2. Frontend converts inputs to backend format via `mapContentFormToBackend()`.
3. Backend checks if `use_knowledge_base` is enabled.
4. If enabled, RAG service queries ChromaDB for relevant document context.
5. System builds a prompt enriched with Pakistani business context and cultural tone guidelines.
6. OpenAI API streams generated text back to the client interface in real time.

---

### 3. RAG Knowledge Base (Document Search)
- **RAG** stands for **Retrieval-Augmented Generation**.
- When a user uploads a business PDF or catalog:
  1. Backend extracts text using `PyMuPDF` or `python-docx`.
  2. Text is split into overlapping chunks (e.g., 500 characters).
  3. Vectors/embeddings are computed and stored in **ChromaDB**.
  4. When generating content, ChromaDB finds the top matching text chunks and feeds them to OpenAI as reference source material.

---

### 4. Visual Image Generation & Gallery
- When users click "Generate Image for Content":
  1. Backend summarizes content into an optimized image prompt.
  2. OpenAI generates image URL.
  3. Backend downloads image content asynchronously and saves it locally in `IMAGE_STORAGE_DIR` (`/static/images/{id}.png`).
  4. User can view, search, filter, and delete images from the permanent **Image Gallery** tab.

---

### 5. Admin Dashboard & System Analytics
- Admins log in to `/admin` to monitor platform activity:
  - Total users, generations created, knowledge base size.
  - Interactive charts (`Recharts`) showing distribution by City (Karachi vs Lahore vs Islamabad) and Industry.
  - Moderation view to flag or delete inappropriate content entries.
  - User status management (suspend or restore user accounts).

---

## 7. Directory Structure & Summary

```
Pakvoice_AI/
├── backend/
│   ├── api/             # FastAPI Endpoint Routers (auth, generate, documents, history, admin, images)
│   ├── core/            # Security, JWT, Middleware & Logging configuration
│   ├── db/              # ChromaDB vector store & JSON file persistence database
│   ├── models/          # Pydantic schemas for data validation
│   ├── services/        # Business logic (AI service, RAG service, Document service, Image service)
│   ├── config.py        # Environment variables & application settings
│   ├── main.py          # FastAPI application entry point
│   └── requirements.txt # Python package dependencies
│
├── frontend/
│   ├── app/             # Next.js App Router pages ( (auth), admin, client )
│   ├── components/      # UI components (Header, Sidebar, Cards, Modals, Forms, Charts)
│   ├── hooks/           # Custom React hooks (useQueries, useAdminStats, useClientStats)
│   ├── lib/             # API client (api.ts), utility functions, QueryProvider
│   ├── stores/          # Zustand state stores (authStore, generateStore, kbStore, adminStore, uiStore)
│   ├── types/           # TypeScript type interfaces
│   └── package.json     # Node.js dependencies
│
└── README.md            # Main project overview
```

---
> 💡 *Created for Intern Onboarding & Project Training — Pakvoice AI / ContentPK AI Engine.*
