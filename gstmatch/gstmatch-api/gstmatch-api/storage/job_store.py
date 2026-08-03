"""
Job store with Supabase persistence and in-memory fallback.

Uses the Supabase REST API (PostgREST) to persist reconciliation results
in the `reconciliation_results` table.  If the Supabase URL or service role
key are not configured (or contain placeholder values), the store gracefully
falls back to an in-memory dictionary so local development keeps working.
"""
import os
from typing import Dict, Optional

import httpx

from models.schemas import ReconciliationResult

# ── In-memory fallback store ──────────────────────────────────────────────────
_store: Dict[str, ReconciliationResult] = {}

# ── Supabase configuration ─────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

SUPABASE_CONFIGURED = bool(
    SUPABASE_URL
    and SUPABASE_KEY
    and "your-project" not in SUPABASE_URL
    and "your_service_role_key" not in SUPABASE_KEY
)

_TABLE = "reconciliation_results"
_REST_URL = f"{SUPABASE_URL}/rest/v1/{_TABLE}" if SUPABASE_CONFIGURED else ""


def _headers() -> dict:
    """Return the headers required by the Supabase REST API."""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


# ── Public API ─────────────────────────────────────────────────────────────────
def save(job_id: str, result: ReconciliationResult, user_id: str = "") -> None:
    """Persist a reconciliation result.

    Saves to Supabase when configured, otherwise falls back to the in-memory
    dict.  Any Supabase error is logged and the result is also kept in memory
    so the caller can still retrieve it immediately.
    """
    # Always keep an in-memory copy as a safety net
    _store[job_id] = result

    if not SUPABASE_CONFIGURED:
        return

    payload = {
        "id": job_id,
        "user_id": user_id or None,
        "period": result.period,
        "gstin": result.gstin,
        "data": result.model_dump(),
    }

    try:
        resp = httpx.post(
            _REST_URL,
            headers={**_headers(), "Prefer": "resolution=merge-duplicates"},
            json=payload,
            timeout=30.0,
        )
        if resp.status_code not in (200, 201):
            print(
                f"[job_store] Supabase save failed: "
                f"{resp.status_code} {resp.text}"
            )
    except Exception as exc:
        print(f"[job_store] Supabase save error: {exc}")


def get(job_id: str) -> Optional[ReconciliationResult]:
    """Retrieve a reconciliation result by job ID.

    Queries Supabase when configured, otherwise reads from the in-memory dict.
    On Supabase failure the in-memory copy is returned as a fallback.
    """
    if not SUPABASE_CONFIGURED:
        return _store.get(job_id)

    try:
        resp = httpx.get(
            f"{_REST_URL}?id=eq.{job_id}",
            headers=_headers(),
            timeout=30.0,
        )
        if resp.status_code == 200:
            rows = resp.json()
            if rows:
                data = rows[0].get("data")
                if data:
                    return ReconciliationResult(**data)
        return None
    except Exception as exc:
        print(f"[job_store] Supabase get error: {exc}")
        return _store.get(job_id)


def exists(job_id: str) -> bool:
    """Check whether a job ID exists in the store."""
    if not SUPABASE_CONFIGURED:
        return job_id in _store

    try:
        resp = httpx.get(
            f"{_REST_URL}?id=eq.{job_id}&select=id",
            headers=_headers(),
            timeout=30.0,
        )
        if resp.status_code == 200:
            rows = resp.json()
            return bool(rows)
        return False
    except Exception as exc:
        print(f"[job_store] Supabase exists error: {exc}")
        return job_id in _store