"""
MODIFIED FILE — replaces: gstmatch-api/gstmatch-api/storage/job_store.py

Your exact original save()/get()/get_with_owner()/exists()/get_plan() for
invoice-engine results (ReconciliationResult) are UNCHANGED below — same
Supabase-REST-via-httpx pattern, same in-memory fallback, same lazy env
var reading.

Added:
  - save_summary() / get_summary() / get_summary_with_owner() — identical
    pattern, new table `summary_reconciliation_results`, for the 4
    summary-engine reconciliation types
  - count_for_user() now sums BOTH tables. This is the single most
    important correctness fix in this whole addon: a free-tier user has
    2 total reconciliations across ALL 8 types combined, not 2 free runs
    per type. Without this fix, count_for_user() would only ever see rows
    in `reconciliation_results` and a user could get unlimited free runs
    by only ever using summary-engine types.

Requires a new Supabase migration — see
supabase/migrations/0009_summary_reconciliation_results.sql in this addon.
"""
import os
import logging
from typing import Dict, Optional, Union

import httpx

from models.schemas import ReconciliationResult, SummaryReconciliationResult

logger = logging.getLogger(__name__)

TABLE          = "reconciliation_results"
SUMMARY_TABLE  = "summary_reconciliation_results"   # NEW
USERS_TABLE    = "users"

# In-memory fallback stores
_store: Dict[str, ReconciliationResult] = {}
_store_meta: Dict[str, dict] = {}  # job_id -> {user_id, period, gstin}

# NEW — separate in-memory stores for summary-engine results
_summary_store: Dict[str, SummaryReconciliationResult] = {}
_summary_store_meta: Dict[str, dict] = {}


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
    data = row.get("data")
    if not data:
        return None
    try:
        return ReconciliationResult.model_validate(data)
    except Exception as e:  # noqa: BLE001
        logger.warning("Could not parse reconciliation result row: %s", e)
        return None


def _row_to_summary_result(row: dict) -> Optional[SummaryReconciliationResult]:
    data = row.get("data")
    if not data:
        return None
    try:
        return SummaryReconciliationResult.model_validate(data)
    except Exception as e:  # noqa: BLE001
        logger.warning("Could not parse summary reconciliation result row: %s", e)
        return None


# ═══════════════════════════════════════════════════════════════════════════
# EXISTING — invoice-engine results (ReconciliationResult) — UNCHANGED
# ═══════════════════════════════════════════════════════════════════════════

def save(job_id: str, result: ReconciliationResult, user_id: Optional[str] = None) -> None:
    """Persist a reconciliation result, tagged with the owning user id."""
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


def get_with_owner(job_id: str) -> tuple[Optional[ReconciliationResult], Optional[str]]:
    if job_id in _store:
        return _store[job_id], _store_meta.get(job_id, {}).get("user_id")

    if not _enabled():
        return None, None

    url, key = _supabase_config()
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{url}/rest/v1/{TABLE}",
                headers=_auth_headers(key),
                params={"id": f"eq.{job_id}", "select": "data,user_id"},
            )
            if resp.status_code == 200 and resp.json():
                row = resp.json()[0]
                return (_row_to_result(row), row.get("user_id"))
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase get_with_owner error: %s", e)

    return None, None


def exists(job_id: str) -> bool:
    if job_id in _store or job_id in _summary_store:
        return True
    return get(job_id) is not None or get_summary(job_id) is not None


# ═══════════════════════════════════════════════════════════════════════════
# NEW — summary-engine results (SummaryReconciliationResult)
# Exact same pattern as above, new table.
# ═══════════════════════════════════════════════════════════════════════════

def save_summary(job_id: str, result: SummaryReconciliationResult, user_id: Optional[str] = None) -> None:
    _summary_store[job_id] = result
    _summary_store_meta[job_id] = {
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
                f"{url}/rest/v1/{SUMMARY_TABLE}",
                headers=_auth_headers(key),
                json=payload,
            )
            if resp.status_code not in (200, 201):
                logger.warning("Supabase save_summary failed (%s): %s", resp.status_code, resp.text[:200])
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase save_summary error: %s", e)


def get_summary(job_id: str) -> Optional[SummaryReconciliationResult]:
    if job_id in _summary_store:
        return _summary_store[job_id]

    if not _enabled():
        return None

    url, key = _supabase_config()
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{url}/rest/v1/{SUMMARY_TABLE}",
                headers=_auth_headers(key),
                params={"id": f"eq.{job_id}", "select": "data"},
            )
            if resp.status_code == 200 and resp.json():
                return _row_to_summary_result(resp.json()[0])
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase get_summary error: %s", e)

    return None


def get_summary_with_owner(job_id: str) -> tuple[Optional[SummaryReconciliationResult], Optional[str]]:
    if job_id in _summary_store:
        return _summary_store[job_id], _summary_store_meta.get(job_id, {}).get("user_id")

    if not _enabled():
        return None, None

    url, key = _supabase_config()
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{url}/rest/v1/{SUMMARY_TABLE}",
                headers=_auth_headers(key),
                params={"id": f"eq.{job_id}", "select": "data,user_id"},
            )
            if resp.status_code == 200 and resp.json():
                row = resp.json()[0]
                return (_row_to_summary_result(row), row.get("user_id"))
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase get_summary_with_owner error: %s", e)

    return None, None


# ═══════════════════════════════════════════════════════════════════════════
# MODIFIED — count_for_user now spans BOTH tables (see module docstring)
# ═══════════════════════════════════════════════════════════════════════════

def _count_in_table(table: str, user_id: str) -> int:
    url, key = _supabase_config()
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{url}/rest/v1/{table}",
                headers={**_auth_headers(key), "Prefer": "count=exact"},
                params={"user_id": f"eq.{user_id}", "select": "id"},
            )
            if resp.status_code == 200:
                content_range = resp.headers.get("content-range", "")
                if "/" in content_range:
                    return max(int(content_range.rsplit("/", 1)[1]), 0)
                return len(resp.json())
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase count error (%s): %s", table, e)
    return 0


def count_for_user(user_id: str) -> int:
    """Count reconciliation results belonging to a user, across BOTH
    invoice-engine and summary-engine tables (free-tier limiting).
    Free-tier limit is 2 TOTAL reconciliations, not 2 per reconciliation type."""
    if not user_id:
        return 0

    if _enabled():
        invoice_count = _count_in_table(TABLE, user_id)
        summary_count = _count_in_table(SUMMARY_TABLE, user_id)
        return invoice_count + summary_count

    # Offline / fallback count — also spans both in-memory stores
    invoice_offline = sum(1 for m in _store_meta.values() if m.get("user_id") == user_id)
    summary_offline = sum(1 for m in _summary_store_meta.values() if m.get("user_id") == user_id)
    return invoice_offline + summary_offline


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
