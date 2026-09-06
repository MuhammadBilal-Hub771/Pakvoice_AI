"""Persistence facade.

Dispatches every store call to Postgres (``db/sql_store.py``) when
SUPABASE_DB_URL is configured, and to the JSON files
(``db/legacy_json_store.py``) otherwise. Both modules expose identical
signatures, so callers in ``api/`` and ``services/`` import from here and stay
unaware of which backend is active.

The module keeps its original name so the ~40 existing import sites did not
need to change.
"""

from loguru import logger

from config import settings

if settings.use_postgres:
    from db.sql_store import (  # noqa: F401
        _seed_users,
        authenticate_user,
        consume_whatsapp_link_code,
        create_oauth_user,
        create_user,
        create_whatsapp_link_code,
        delete_document_metadata,
        delete_document_metadata_by_user,
        delete_history_item,
        delete_history_item_by_user,
        delete_image_record,
        delete_user,
        delete_whatsapp_session,
        get_all_documents,
        get_document_by_id,
        get_document_by_id_and_user,
        get_document_categories,
        get_history_by_id,
        get_history_by_id_and_user,
        get_image_by_id,
        get_user_by_email,
        get_user_by_id,
        get_user_by_whatsapp_phone,
        get_user_document_categories,
        get_user_documents,
        get_user_history,
        get_user_images,
        get_whatsapp_session,
        list_agent_runs,
        list_all_history,
        list_users,
        mark_whatsapp_message_processed,
        prune_whatsapp_processed_messages,
        save_agent_run,
        save_document_metadata,
        save_generation_history,
        save_image_record,
        set_user_whatsapp_phone,
        update_history,
        update_history_by_user,
        update_user,
        upsert_whatsapp_session,
    )

    BACKEND = "postgres"
else:
    from db.legacy_json_store import (  # noqa: F401
        _read_json,
        _seed_users,
        _write_json,
        authenticate_user,
        consume_whatsapp_link_code,
        create_oauth_user,
        create_user,
        create_whatsapp_link_code,
        delete_document_metadata,
        delete_document_metadata_by_user,
        delete_history_item,
        delete_history_item_by_user,
        delete_image_record,
        delete_user,
        delete_whatsapp_session,
        get_all_documents,
        get_document_by_id,
        get_document_by_id_and_user,
        get_document_categories,
        get_history_by_id,
        get_history_by_id_and_user,
        get_image_by_id,
        get_user_by_email,
        get_user_by_id,
        get_user_by_whatsapp_phone,
        get_user_document_categories,
        get_user_documents,
        get_user_history,
        get_user_images,
        get_whatsapp_session,
        list_agent_runs,
        list_all_history,
        list_users,
        mark_whatsapp_message_processed,
        save_agent_run,
        save_document_metadata,
        save_generation_history,
        save_image_record,
        set_user_whatsapp_phone,
        update_history,
        update_history_by_user,
        update_user,
        upsert_whatsapp_session,
    )

    def prune_whatsapp_processed_messages(older_than_days: int = 7) -> int:
        """No-op: the JSON store already caps its processed-message window."""
        return 0

    BACKEND = "json"


def log_active_backend() -> None:
    if BACKEND == "postgres":
        logger.info("Persistence backend: Supabase Postgres")
    else:
        logger.warning(
            "Persistence backend: local JSON files. Set SUPABASE_DB_URL to use "
            "Postgres — the JSON store has no locking and loses concurrent writes."
        )
