"""Shared slowapi limiter.

Lives in its own module so route modules can apply ``@limiter.limit(...)``
without importing ``main`` and creating a circular import.

Limits are keyed by client IP. That is the right unit for the browser API, but
not for the WhatsApp webhook, where every request arrives from Meta's servers
and would share a single bucket — per-phone throttling is handled inside the
bot instead.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT],
)
