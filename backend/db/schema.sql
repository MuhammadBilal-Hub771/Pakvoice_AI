-- PakVoice AI - Supabase schema
--
-- Run this once in the Supabase SQL editor (or via psql against SUPABASE_DB_URL)
-- before starting the backend with SUPABASE_DB_URL configured.
--
-- Safe to re-run: every statement is idempotent.

create extension if not exists "uuid-ossp";
create extension if not exists vector;


-- ===========================================================================
-- users
-- ===========================================================================

create table if not exists users (
    id              uuid primary key default uuid_generate_v4(),
    name            text        not null,
    email           text        not null unique,
    hashed_password text        not null,
    role            text        not null default 'client'
                    check (role in ('admin', 'client')),
    city            text        not null default '',
    industry        text,
    is_active       boolean     not null default true,
    whatsapp_phone  text unique,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz
);

create index if not exists users_role_idx on users (role);


-- ===========================================================================
-- generation_history
-- ===========================================================================

create table if not exists generation_history (
    content_id         uuid primary key,
    user_id            uuid not null references users (id) on delete cascade,
    business_name      text        not null default '',
    content_type       text        not null default '',
    industry           text        not null default '',
    city               text        not null default '',
    language           text        not null default 'english',
    tone               text        not null default 'professional',
    generated_content  text        not null default '',
    tokens_used        integer     not null default 0,
    cost_usd           double precision not null default 0,
    generation_time_ms integer     not null default 0,
    sources_used       jsonb       not null default '[]'::jsonb,
    is_saved           boolean     not null default false,
    is_flagged         boolean     not null default false,
    -- 'web' or 'whatsapp'; lets the admin dashboard split channels
    source_channel     text        not null default 'web',
    created_at         timestamptz not null default now(),
    updated_at         timestamptz
);

create index if not exists generation_history_user_created_idx
    on generation_history (user_id, created_at desc);
create index if not exists generation_history_created_idx
    on generation_history (created_at desc);
create index if not exists generation_history_flagged_idx
    on generation_history (is_flagged) where is_flagged;


-- ===========================================================================
-- documents  (knowledge base metadata)
-- ===========================================================================

create table if not exists documents (
    doc_id          uuid primary key,
    uploaded_by     uuid not null references users (id) on delete cascade,
    title           text        not null default '',
    category        text        not null default 'general',
    tags            jsonb       not null default '[]'::jsonb,
    filename        text        not null default '',
    -- Supabase Storage object path; NULL for rows migrated from local disk
    storage_path    text,
    -- legacy local filesystem path, kept so old uploads stay deletable
    file_path       text,
    file_size_bytes bigint      not null default 0,
    word_count      integer     not null default 0,
    chunks_created  integer     not null default 0,
    status          text        not null default 'processed',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz
);

create index if not exists documents_uploaded_by_idx on documents (uploaded_by);
create index if not exists documents_category_idx on documents (uploaded_by, category);


-- ===========================================================================
-- document_chunks  (pgvector - replaces ChromaDB)
-- ===========================================================================

-- 1536 dimensions matches OpenAI text-embedding-3-small.
-- Changing the embedding model requires recreating this table.
create table if not exists document_chunks (
    id          bigserial primary key,
    doc_id      uuid not null references documents (doc_id) on delete cascade,
    user_id     uuid not null references users (id) on delete cascade,
    chunk_index integer     not null default 0,
    content     text        not null,
    title       text        not null default '',
    category    text        not null default 'general',
    embedding   vector(1536),
    created_at  timestamptz not null default now(),
    unique (doc_id, chunk_index)
);

-- user_id must lead the index: every RAG search is scoped to one user, and
-- this is what stops one tenant's chunks surfacing in another's results.
create index if not exists document_chunks_user_idx on document_chunks (user_id);
create index if not exists document_chunks_doc_idx on document_chunks (doc_id);

create index if not exists document_chunks_embedding_idx
    on document_chunks using hnsw (embedding vector_cosine_ops);


-- ===========================================================================
-- images  (generated image gallery)
-- ===========================================================================

create table if not exists images (
    id             uuid primary key,
    user_id        uuid not null references users (id) on delete cascade,
    -- Serving URL as returned to the client. Absolute for Supabase Storage
    -- signed URLs, relative (/static/images/...) for legacy local files.
    image_url      text        not null default '',
    image_type     text        not null default 'social_media',
    source_content text        not null default '',
    -- Supabase Storage object path; NULL for rows still on local disk
    storage_path   text,
    created_at     timestamptz not null default now()
);

create index if not exists images_user_created_idx
    on images (user_id, created_at desc);


-- ===========================================================================
-- agent_runs  (client content agent audit trail)
-- ===========================================================================

create table if not exists agent_runs (
    id         uuid primary key,
    user_id    uuid not null references users (id) on delete cascade,
    goal       text        not null default '',
    steps      jsonb       not null default '[]'::jsonb,
    success    boolean     not null default false,
    created_at timestamptz not null default now()
);

create index if not exists agent_runs_user_created_idx
    on agent_runs (user_id, created_at desc);


-- ===========================================================================
-- whatsapp_sessions  (conversation state per phone number)
-- ===========================================================================

create table if not exists whatsapp_sessions (
    phone      text primary key,
    user_id    uuid references users (id) on delete cascade,
    state      text        not null default 'new',
    context    jsonb       not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create index if not exists whatsapp_sessions_user_idx
    on whatsapp_sessions (user_id);


-- ===========================================================================
-- whatsapp_link_codes  (one-time codes that bind a phone to an account)
-- ===========================================================================

create table if not exists whatsapp_link_codes (
    code       text primary key,
    user_id    uuid not null references users (id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index if not exists whatsapp_link_codes_user_idx
    on whatsapp_link_codes (user_id);
create index if not exists whatsapp_link_codes_expires_idx
    on whatsapp_link_codes (expires_at);


-- ===========================================================================
-- whatsapp_processed_messages  (webhook idempotency)
-- ===========================================================================

-- Meta retries webhook delivery for up to 7 days until it gets a 200, so the
-- same message id can arrive more than once. Inserting here acts as the lock.
create table if not exists whatsapp_processed_messages (
    message_id   text primary key,
    processed_at timestamptz not null default now()
);

create index if not exists whatsapp_processed_messages_processed_idx
    on whatsapp_processed_messages (processed_at);
