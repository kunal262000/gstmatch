import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from core.parser import parse_purchase_register, parse_gstr2b
from core.reconciler import reconcile
from models.schemas import UploadResponse
import storage.job_store as store

# ── Usage limits ───────────────────────────────────────────────────────────────
PLAN_LIMITS = {
    "free": 50,
    "starter": 500,
    "growth": 2000,
}

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

router = APIRouter()


@router.post("/reconcile", response_model=UploadResponse)
async def start_reconciliation(
    purchase_register: UploadFile = File(..., description="Purchase register Excel or CSV"),
    gstr2b:            UploadFile = File(..., description="GSTR-2B Excel or JSON"),
    period:            str        = Form(..., description="e.g. June 2025"),
    gstin:             str        = Form(..., description="Your 15-character GSTIN"),
    business_name:     str        = Form("", description="Your business name"),
    user_id:           str        = Form("", description="User ID from Supabase auth"),
):
    # ── Read files ────────────────────────────────────────────────────────────
    pr_bytes   = await purchase_register.read()
    gstr_bytes = await gstr2b.read()

    if not pr_bytes:
        raise HTTPException(400, "Purchase register file is empty.")
    if not gstr_bytes:
        raise HTTPException(400, "GSTR-2B file is empty.")

    # ── Usage limit check ──────────────────────────────────────────────────────
    if user_id and SUPABASE_URL and SUPABASE_KEY and "your-project" not in SUPABASE_URL:
        import httpx
        try:
            user_resp = httpx.get(
                f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=plan,usage_count",
                headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
                timeout=10.0,
            )
            if user_resp.status_code == 200:
                users = user_resp.json()
                if users:
                    plan = users[0].get("plan", "free")
                    usage = users[0].get("usage_count", 0)
                    limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
                    if usage >= limit:
                        raise HTTPException(
                            429,
                            f"Monthly limit reached ({usage}/{limit} invoices). Upgrade your plan to continue."
                        )
        except HTTPException:
            raise
        except Exception:
            pass  # If Supabase check fails, allow the request

    # ── Parse ─────────────────────────────────────────────────────────────────
    pr_df, pr_err = parse_purchase_register(pr_bytes, purchase_register.filename or "")
    if pr_err:
        raise HTTPException(422, f"Purchase register error: {pr_err}")

    g2b_df, g2b_err = parse_gstr2b(gstr_bytes, gstr2b.filename or "")
    if g2b_err:
        raise HTTPException(422, f"GSTR-2B error: {g2b_err}")

    if pr_df.empty:
        raise HTTPException(422, "No valid invoice rows found in purchase register.")
    if g2b_df.empty:
        raise HTTPException(422, "No valid invoice rows found in GSTR-2B.")

    # ── Reconcile ─────────────────────────────────────────────────────────────
    job_id = str(uuid.uuid4())
    result = reconcile(
        pr_df         = pr_df,
        gstr2b_df     = g2b_df,
        period        = period,
        gstin         = gstin.upper().strip(),
        business_name = business_name or "My Business",
        job_id        = job_id,
    )

    # ── Store ─────────────────────────────────────────────────────────────────
    store.save(job_id, result, user_id)

    # ── Increment usage count ──────────────────────────────────────────────────
    if user_id and SUPABASE_URL and SUPABASE_KEY and "your-project" not in SUPABASE_URL:
        try:
            import httpx
            invoice_count = result.summary.totalInvoices
            httpx.patch(
                f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates",
                },
                json={"usage_count": f"usage_count + {invoice_count}"},
                timeout=10.0,
            )
        except Exception:
            pass

    return UploadResponse(
        jobId   = job_id,
        message = f"Reconciliation complete. {result.summary.totalInvoices} invoices processed.",
    )
