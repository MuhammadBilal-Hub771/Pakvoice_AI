# PakVoice AI — AI-Powered Pakistani Business Content Generator

A production-ready Next.js 14 (App Router) frontend for generating culturally-relevant business content for the Pakistani market.

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS v3** with custom design system
- **Framer Motion** for animations
- **Zustand** for state management
- **TanStack Query v5** for API calls
- **React Hook Form + Zod** for form validation
- **next-themes** for dark/light mode
- **Lucide React** for icons
- **Recharts** for charts
- **Custom SVG illustrations** (zero raster images)

## Features

### Client Portal
- Home dashboard with quick stats and content type quick-launch
- Full content generation form with:
  - Content type selection (pill buttons)
  - Industry selection (grid with icons)
  - Interactive Pakistan map for city selection
  - Language selection (English, Urdu, Roman Urdu)
  - Tone and content length configuration
  - Knowledge base document selection
- Real-time content output with refinement panel
- Content history with search and filters
- Knowledge base management (drag-and-drop upload)
- User profile management

### Admin Portal
- Dashboard with metric cards and activity feed
- City-wise content usage map
- User management with table and detail drawer
- Content review system with preview modal
- Analytics dashboard with charts
- API keys management
- Platform settings

### Design System
- Pakistani flag-inspired color palette
- Urdu language support (Noto Nastaliq Urdu font)
- Dark/Light mode
- Responsive design (mobile bottom nav)
- RTL support for Urdu content
- Animated SVG illustrations

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Navigate to the project directory
cd pakvoice-ai

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Flask backend URL:

```env
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Flask Backend Connection

This frontend connects to a Flask backend API. Expected endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/google` | GET | Google OAuth |
| `/api/generate` | POST | Generate content |
| `/api/history` | GET | Get generation history |
| `/api/documents` | GET/POST | Manage knowledge base documents |
| `/api/admin/stats` | GET | Admin dashboard stats |
| `/api/admin/users` | GET | User management |
| `/api/admin/content` | GET | Content review |

## Project Structure

```
pakvoice-ai/
├── app/
│   ├── (auth)/           # Login & Register pages
│   ├── (admin)/          # Admin portal pages
│   ├── (client)/         # Client portal pages
│   ├── api/              # API route handlers (proxy to Flask)
│   ├── globals.css       # Global styles & CSS variables
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Root page (redirect)
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── admin/            # Admin-specific components
│   ├── client/           # Client-specific components
│   ├── shared/           # Shared UI components
│   └── illustrations/    # Inline SVG components
├── hooks/                # TanStack Query hooks
├── stores/               # Zustand stores
├── lib/                  # Utilities & API client
├── types/                # TypeScript types
└── public/               # Static assets
```

## License

MIT
