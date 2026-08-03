"""
Reconciliation job store.

Persists results to Supabase (Postgres via the REST API) using httpx, keyed by
the optional Supabase URL / service-role key.

If Supabase env vars are missing (dev/local demo), it gracefully falls back to
in-memory dictionaries so reconciliation keeps working with no dependencies.

Important: env vars are read lazily inside each call (not at import time) because
main.py imports routes before it calls load_dotenv(); reading at import time would
see empty values when running against a local .env file.
"""
import os
import logging
from typing import Dict, Optional

import httpx

from models.schemas import ReconciliationResult

logger = logging.getLogger(__name__)

TABLE = "reconciliation_results"
USERS_TABLE = "users"

# In-memory fallback stores
_store: Dict[str, ReconciliationResult] = {}
_store_meta: Dict[str, dict] = {}  # job_id -> {user_id, period, gstin}


def _supabase_config() -> tuple[str, str]:
    """Return (supabase_url, service_key) re-read from env each call."""
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")).strip()
    return url, key


def _enabled() -> bool:
    url, key = _supabase_config()
    return bool(url and key and "your-project" not in url)


def _auth_headers(key: str) -> dict:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _row_to_result(row: dict) -> Optional[ReconciliationResult]:
    """Extract the ReconciliationResult from a stored row (JSONB in `data`)."""
    data = row.get("data")
    if not data:
        return None
    try:
        return ReconciliationResult.model_validate(data)
    except Exception as e:  # noqa: BLE001
        logger.warning("Could not parse reconciliation result row: %s", e)
        return None


def save(job_id: str, result: ReconciliationResult, user_id: Optional[str] = None) -> None:
    """Persist a reconciliation result, tagged with the owning user id."""
    # Always keep an in-memory copy (acts as cache + offline fallback)
    _store[job_id] = result
    _store_meta[job_id] = {
        "user_id": user_id,
        "period": result.period,
        "gstin": result.gstin,
    }

    if not _enabled():
        return

    url, key = _supabase_config()
    payload = {
        "id": job_id,
        "user_id": user_id,
        "period": result.period,
        "gstin": result.gstin,
        "data": result.model_dump(mode="json"),
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"{url}/rest/v1/{TABLE}",
                headers=_auth_headers(key),
                json=payload,
            )
            if resp.status_code not in (200, 201):
                logger.warning("Supabase save failed (%s): %s", resp.status_code, resp.text[:200])
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase save error: %s", e)


def get(job_id: str) -> Optional[ReconciliationResult]:
    """Return a stored result, checking memory first then Supabase."""
    if job_id in _store:
        return _store[job_id]

    if not _enabled():
        return None

    url, key = _supabase_config()
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{url}/rest/v1/{TABLE}",
                headers=_auth_headers(key),
                params={"id": f"eq.{job_id}", "select": "data"},
            )
            if resp.status_code == 200 and resp.json():
                return _row_to_result(resp.json()[0])
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase get error: %s", e)

    return None


def exists(job_id: str) -> bool:
    if job_id in _store:
        return True
    return get(job_id) is not None


def count_for_user(user_id: str) -> int:
    """Count reconciliation results belonging to a user (free-tier limiting)."""
    if not user_id:
        return 0

    if _enabled():
        url, key = _supabase_config()
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    f"{url}/rest/v1/{TABLE}",
                    headers={**_auth_headers(key), "Prefer": "count=exact"},
                    params={"user_id": f"eq.{user_id}", "select": "id"},
                )
                if resp.status_code == 200:
                    content_range = resp.headers.get("content-range", "")
                    if "/" in content_range:
                        return max(int(content_range.rsplit("/", 1)[1]), 0)
                    return len(resp.json())
        except Exception as e:  # noqa: BLE001
            logger.warning("Supabase count error: %s", e)

    # Offline / fallback count
    return sum(1 for m in _store_meta.values() if m.get("user_id") == user_id)


def get_plan(user_id: str) -> str:
    """Return the user's plan ('free' when unknown or in offline mode)."""
    if not user_id:
        return "free"

    if _enabled():
        url, key = _supabase_config()
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(
                    f"{url}/rest/v1/{USERS_TABLE}",
                    headers=_auth_headers(key),
                    params={"id": f"eq.{user_id}", "select": "plan"},
                )
                if resp.status_code == 200 and resp.json():
                    return resp.json()[0].get("plan", "free") or "free"
        except Exception as e:  # noqa: BLE001
            logger.warning("Supabase get_plan error: %s", e)

    return "free"
