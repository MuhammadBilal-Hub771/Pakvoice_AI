FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# libmagic1 is needed by the file parsers; curl backs the container healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libmagic1 \
        curl \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first so dependency layers cache across code changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Only used when Supabase Storage is not configured. Owned by the app user so
# writes succeed after the USER switch below.
RUN mkdir -p /app/uploads /app/generated_images /app/data /app/chroma_db \
    && useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health/ || exit 1

# Single worker: the in-memory JWT blacklist and WhatsApp throttle are
# per-process, so extra workers would each keep their own copy. Scale with
# replicas behind a load balancer only after moving those to Redis.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
