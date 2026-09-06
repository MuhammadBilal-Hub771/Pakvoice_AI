# Alembic migrations

`db/schema.sql` is the quick-start path: paste it into the Supabase SQL editor
once and the schema is ready. Alembic exists for everything *after* that, so
schema changes are versioned instead of applied by hand.

## Setup

`SUPABASE_DB_URL` must be set in `backend/.env`. Alembic reads it via
`alembic/env.py` rather than `alembic.ini`, so no credentials are committed.

## Marking the baseline

If you created the schema with `db/schema.sql`, tell Alembic the database is
already at the initial revision so it does not try to recreate the tables:

```bash
cd backend
alembic stamp 0001_initial
```

## Everyday use

```bash
# after editing db/models_sql.py
alembic revision --autogenerate -m "add whatsapp opt_in column"
alembic upgrade head

# inspect
alembic current
alembic history
```

## pgvector caveat

Autogenerate does not always emit the `vector` column type correctly. When a
revision touches `document_chunks.embedding`, check the generated file and add
`import pgvector.sqlalchemy` plus the explicit
`pgvector.sqlalchemy.Vector(1536)` type if it is missing.
