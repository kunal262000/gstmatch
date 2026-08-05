"""
Supabase JWT verification for protecting backend API routes.

Production mode (recommended): set SUPABASE_JWT_SECRET in your environment.
When present, every protected route is authenticated via a FastAPI dependency
injected per-request. Anonymous clients (no/invalid token) are rejected with 401,
so endpoints like /api/results/{job_id} enforce real ownership instead of trusting
a client-supplied id.

Development mode (fallback): if SUPABASE_JWT_SECRET is not set, current_user_or_401()
returns None (fail-open) instead of raising, so local development with the in-memory
store is still frictionless. This is detected per-call so routes are safe-by-default
in production without extra wiring.

Usage:
    from core.auth import current_user_or_401
    @router.get("/results/{job_id}")
    def get_result(job_id: str, user_id: auth = Depends(current_user_or_401)):
        # user_id is the authenticated user's Supabase id (str) or None in dev
"""
import os
import hmac
import time
import json
import base64
from typing import Optional

from fastapi import Request, HTTPException


def _b64url_decode(s: str) -> bytes:
    """Decode a base64url string, padding as needed."""
    s += "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)


def _jwt_secret() -> Optional[str]:
    """Read the Supabase JWT signing secret lazily (env may load after import)."""
    return (os.getenv("SUPABASE_JWT_SECRET", "") or "").strip() or None


def verify_supabase_jwt(token: str) -> Optional[str]:
    """
    Verify a Supabase signed JWT (HS256) and return the user id ('sub').

    Returns None if verification fails. This is a focused verifier for the
    standard Supabase token structure: header.payload.signature, signed with
    the project's JWT_SECRET using HS256.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        secret = _jwt_secret()
        if not secret:
            return None

        # Reconstruct the signed content exactly as Supabase signs it: base64url(header).base64url(payload)
        signing_input = (header_b64 + "." + payload_b64).encode("ascii")

        # Compute expected signature with HMAC-SHA256
        expected_sig = hmac.new(secret.encode("utf-8"), signing_input, "sha256").digest()
        provided_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        # Decode payload (no verification needed beyond signature, already checked above)
        payload = json.loads(_b64url_decode(payload_b64))

        # Validate audience is "authenticated"
        if payload.get("aud") != "authenticated":
            return None

        # Validate expiry
        exp = payload.get("exp")
        if isinstance(exp, (int, float)) and time.time() > exp:
            return None

        return payload.get("sub")
    except Exception:
        return None


def current_user_or_401(request: Request) -> Optional[str]:
    """
    Dependency that returns the authenticated Supabase user id, or raises 401.

    Fail-closed in production (when SUPABASE_JWT_SECRET is set): a missing/invalid
    token => 401 'Authentication required' / 'Invalid or expired token'.
    Fail-open in development: when no JWT secret is configured, returns None
    so local in-memory mode keeps working without auth friction.
    """
    secret = _jwt_secret()

    # Dev mode: no secret configured, allow anonymous access locally.
    if not secret:
        return None

    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    token = auth_header[len("Bearer "):].strip()
    user_id = verify_supabase_jwt(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id
