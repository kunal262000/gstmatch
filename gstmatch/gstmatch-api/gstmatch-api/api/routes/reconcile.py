import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from core.parser import parse_purchase_register, parse_gstr2b
from core.reconciler import reconcile
from models.schemas import UploadResponse
import storage.job_store as store

router = APIRouter()

# Free-tier cap on reconciliations per user (paid users are unlimited).
FREE_RECON_LIMIT = int(os.getenv("FREE_RECON_LIMIT", "2"))


@router.post("/reconcile", response_model=UploadResponse)
async def start_reconciliation(
    purchase_register: UploadFile = File(..., description="Purchase register Excel or CSV"),
    gstr2b:            UploadFile = File(..., description="GSTR-2B Excel or JSON"),
    period:            str        = Form(..., description="e.g. June 2025"),
    gstin:             str        = Form(..., description="Your 15-character GSTIN"),
    business_name:     str        = Form("", description="Your business name"),
    user_id:           str        = Form("", description="Logged-in user id (optional)"),
):
    # ── Enforce free-tier limit BEFORE doing any heavy work ──────────────────
    if user_id:
        plan = store.get_plan(user_id)
        if plan in ("", "none", "free", "trial"):
            used = store.count_for_user(user_id)
            if used >= FREE_RECON_LIMIT:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"You've used all {FREE_RECON_LIMIT} free reconciliations. "
                        "Upgrade your plan to keep running reconciliations."
                    ),
                )

    # ── Read files ────────────────────────────────────────────────────────────
    pr_bytes   = await purchase_register.read()
    gstr_bytes = await gstr2b.read()

    if not pr_bytes:
        raise HTTPException(400, "Purchase register file is empty.")
    if not gstr_bytes:
        raise HTTPException(400, "GSTR-2B file is empty.")

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
    store.save(job_id, result, user_id or None)

    return UploadResponse(
        jobId   = job_id,
        message = f"Reconciliation complete. {result.summary.totalInvoices} invoices processed.",
    )
