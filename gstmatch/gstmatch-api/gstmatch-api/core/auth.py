"""
Supabase token validation for protecting backend API routes.

Production mode (recommended): the caller sends their Supabase access token in the
Authorization header. We validate it by asking Supabase's own /auth/v1/user endpoint
(the same way the Next.js middleware validates it), which always stays in sync with
the project's signing keys, so no manually-configured shared JWT secret is needed.

Development mode (fallback): if Supabase isn't configured, current_user_or_401()
returns None (fail-open) so local in-memory demoing keeps working.

Usage:
    from core.auth import current_user_or_401
    @router.get("/results/{job_id}")
    def get_result(job_id: str, user_id: str | None = Depends(current_user_or_401)):
        # user_id is the authenticated user's Supabase id (str) or None in dev
"""
import os
from typing import Optional

import httpx
from fastapi import Request, HTTPException


def _supabase_configured() -> bool:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (os.getenv("SUPABASE_ANON_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")).strip()
    return bool(url and key and "your-project" not in url)


def _supabase_key() -> str:
    return (os.getenv("SUPABASE_ANON_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")).strip()


def verify_supabase_token(token: str) -> Optional[str]:
    """
    Validate a Supabase access token against the project's /auth/v1/user endpoint
    and return the user id (== JWT 'sub'). Returns None if invalid/expired.
    """
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = _supabase_key()
    if not url or not key:
        return None
    try:
        resp = httpx.get(
            f"{url}/auth/v1/user",
            headers={"apikey": key, "Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
        if resp.status_code == 200:
            return resp.json().get("id")
    except Exception:  # noqa: BLE001
        pass
    return None


def current_user_or_401(request: Request) -> Optional[str]:
    """
    Return the authenticated Supabase user id, or raise 401.

    Fail-closed in production (when Supabase is configured): a missing/invalid token
    => 401. Fail-open in development (no Supabase config): returns None so local
    in-memory mode keeps working without auth friction.
    """
    if not _supabase_configured():
        return None

    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = auth_header[len("Bearer "):].strip()
    user_id = verify_supabase_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id