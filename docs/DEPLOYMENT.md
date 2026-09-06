# PakVoice AI — Deployment

Covers Supabase setup, migrating existing local data, the WhatsApp Cloud API
integration, and running with Docker.

---

## 1. Prerequisites

| What | Why |
| --- | --- |
| Supabase project | Postgres + pgvector + object storage |
| OpenAI API key | content, embeddings, images, transcription |
| Meta developer account | WhatsApp Cloud API (optional) |
| Public HTTPS URL | WhatsApp webhooks; Meta will not call plain HTTP |

---

## 2. Supabase

### 2.1 Create the schema

In the Supabase dashboard open **SQL Editor**, paste the contents of
`backend/db/schema.sql`, and run it. It enables the `vector` extension and
creates every table and index. The file is idempotent, so re-running is safe.

### 2.2 Connection string

**Project Settings → Database → Connection string → URI**. Two options:

- **Connection pooler**, port `6543` — use for serverless or many replicas.
- **Direct connection**, port `5432` — use for a single long-lived process.

Put it in `backend/.env` as `SUPABASE_DB_URL`. The driver prefix is normalised
automatically, so paste the URI as given.

### 2.3 Storage buckets

Create two **private** buckets: `documents` and `images`. Then from
**Project Settings → API** copy the project URL and the `service_role` key:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

The `service_role` key bypasses row level security. It must only ever live on
the server, never in the frontend bundle.

Access control is enforced by the API, not the bucket: every gallery listing
re-signs URLs for the requesting user's own images only.

### 2.4 Verify

```bash
cd backend
python -c "from db.session import check_connection; print(check_connection())"
```

`True` means the app can reach Postgres.

---

## 3. Migrating existing local data

Only needed if you have been running with the JSON file store.

```bash
cd backend
python -m scripts.migrate_json_to_supabase --dry-run   # report only
python -m scripts.migrate_json_to_supabase             # apply
```

What it does:

- Copies `data/users.json`, `history.json`, `documents.json` and `images.json`
  into Postgres, preserving ids.
- Copies ChromaDB chunk embeddings into `document_chunks`. Embeddings are
  reused rather than recomputed, so this costs no OpenAI credit — but only
  works while `EMBEDDING_MODEL` is unchanged. Use `--skip-chunks` and re-upload
  the documents if you have switched models.
- Skips rows whose owning user is missing rather than reassigning them.
- Is safe to re-run; existing rows are left alone.

Files already on local disk stay there. Their metadata rows keep the old
`file_path`, so deletion still cleans them up. Only new uploads go to Supabase
Storage.

The JSON files are not deleted. Keep them until you have verified the app
against Postgres.

---

## 4. WhatsApp Cloud API

### 4.1 Meta app setup

1. At [developers.facebook.com](https://developers.facebook.com/apps) create an
   app of type **Business**.
2. Add the **WhatsApp** product. This provisions a test number and a temporary
   24-hour token.
3. **WhatsApp → API Setup**: copy the **Phone number ID** into
   `WHATSAPP_PHONE_NUMBER_ID`.
4. **App Settings → Basic**: copy the **App Secret** into
   `WHATSAPP_APP_SECRET`. This is what verifies webhook signatures — without
   it, anyone who finds the webhook URL could drive the bot and spend your
   OpenAI credit.
5. Create a permanent token: **Business Settings → System Users → Add**, assign
   the app with full control, then **Generate token** with the
   `whatsapp_business_messaging` and `whatsapp_business_management` scopes. Put
   it in `WHATSAPP_ACCESS_TOKEN`. The temporary token in the dashboard expires
   after 24 hours and will silently break the bot.
6. Invent any string for `WHATSAPP_VERIFY_TOKEN`. It only needs to match what
   you type into the webhook form below.

### 4.2 Webhook

The webhook must be reachable over HTTPS. For local development:

```bash
ngrok http 8000
```

In the Meta dashboard, **WhatsApp → Configuration → Webhook → Edit**:

- Callback URL: `https://<your-domain>/api/whatsapp/webhook`
- Verify token: the value of `WHATSAPP_VERIFY_TOKEN`

Click **Verify and save**. Meta sends a GET with a challenge that the app echoes
back; a failure here almost always means a token mismatch or the backend not
being reachable.

Then **Manage** the webhook fields and subscribe to **messages**.

Set `WHATSAPP_ENABLED=true` and restart. Startup logs
`WhatsApp Cloud API configured` when all five values are present.

### 4.3 Connecting a user account

The bot will not act on an unrecognised number. Linking is deliberate:

1. User opens **Profile → Connected Channels → Connect WhatsApp**.
2. The app issues a 6-digit code, valid for `WHATSAPP_LINK_CODE_TTL_MINUTES`.
3. The user sends that code to the WhatsApp number.
4. The bot binds the phone to the account and shows the menu. The profile page
   updates on its own.

Issuing a new code invalidates the previous one. One phone number maps to at
most one account.

### 4.4 What the bot can do

- Write content from typed text or a voice note (transcribed with Whisper)
- Refine the last generated piece
- Generate an image from a brief or from the last piece of content
- List recent generations
- Add a document to the knowledge base by sending a file
- Change default language, content type and tone

Content generated over WhatsApp is recorded with `source_channel = 'whatsapp'`,
so the admin dashboard can separate the two surfaces.

### 4.5 Things that will bite you

**Sending images requires Supabase Storage.** Meta fetches the image URL from
its own servers, so it has to be publicly reachable. Without
`SUPABASE_URL`/`SUPABASE_SERVICE_KEY` the file only exists on the app's local
disk and the bot tells the user to open the gallery instead.

**The 24-hour window.** Free-form messages are only allowed within 24 hours of
the user's last message. The bot only ever replies, so it stays inside the
window. Any future proactive message (a scheduled post reminder, say) needs a
Meta-approved template.

**Test numbers.** Before business verification you can only message numbers
added under **API Setup → To**.

**Webhook retries.** Meta retries anything that is not answered with 200 for up
to seven days. The app therefore answers 200 immediately and processes in the
background, and dedupes on message id so a retry does not generate content
twice.

---

## 5. Docker

```bash
cp backend/.env.example backend/.env   # then fill it in
docker compose up --build
```

- Backend: <http://localhost:8000/docs>
- Frontend: <http://localhost:3000>

`NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time, so for a
real deployment set it before building:

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com docker compose up --build
```

There is no Postgres service in the compose file: the database is Supabase.

---

## 6. Production checklist

- [ ] `DEBUG=false`. With it on, demo accounts are seeded with known passwords
      and `/api/auth/google` hands out a session to anyone who visits it.
- [ ] `SECRET_KEY` is a fresh random value:
      `python -c "import secrets; print(secrets.token_urlsafe(48))"`
- [ ] `SUPABASE_DB_URL` set, `db/schema.sql` applied
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` set, both buckets private
- [ ] `ALLOWED_ORIGINS` and `FRONTEND_URL` list the real frontend origin
- [ ] Any API key that was ever committed has been rotated
- [ ] HTTPS terminated in front of the app
- [ ] `/api/health/ready` reports `ready`

### Known limits at scale

Three things are held in process memory and are per-instance, so they do not
hold across replicas:

| What | Effect with multiple instances |
| --- | --- |
| JWT blacklist (`core/security.py`) | A logged-out token still works on other instances until it expires |
| WhatsApp per-phone throttle | Effective limit is the configured value times the instance count |
| Rate limiter (slowapi, in-memory) | Same multiplication |

Moving these to Redis is the prerequisite for running more than one instance.
Until then, scale vertically.

---

## 7. Schema changes after the initial setup

`db/schema.sql` is the one-time bootstrap. Later changes go through Alembic so
they are versioned — see `backend/alembic/README.md`. If you created the schema
from the SQL file, mark the baseline first:

```bash
cd backend
alembic stamp 0001_initial
```
