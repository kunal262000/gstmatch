import os
import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from core.parser import (
    parse_purchase_register, parse_sales_register, parse_gstr2b,
    parse_gstr2a, parse_gstr1, parse_ims, parse_return_summary,
)
from core.reconciler import reconcile
from core.registry import get_recon_metadata
from models.schemas import UploadResponse
import storage.job_store as store

router = APIRouter()

FREE_RECON_LIMIT = int(os.getenv("FREE_RECON_LIMIT", "2"))


@router.post("/reconcile", response_model=UploadResponse)
async def start_reconciliation(
    file1:          Optional[UploadFile] = File(None, description="First file"),
    file2:          Optional[UploadFile] = File(None, description="Second file"),
    # Keep backward compatible field names
    purchase_register: Optional[UploadFile] = File(None),
    gstr2b:            Optional[UploadFile] = File(None),
    recon_type:        str                  = Form("gstr2b_pr", description="Reconciliation type ID"),
    period:            str                  = Form("August 2026", description="e.g. August 2026"),
    gstin:             str                  = Form("27AABCU9603R1ZM", description="Your 15-character GSTIN"),
    business_name:     str                  = Form("", description="Your business name"),
    user_id:           str                  = Form("", description="Logged-in user id (optional)"),
):
    # Resolve uploaded files
    f1 = file1 or purchase_register
    f2 = file2 or gstr2b

    if not f1:
        raise HTTPException(400, "File 1 is required.")
    if not f2:
        raise HTTPException(400, "File 2 is required.")

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

    f1_bytes = await f1.read()
    f2_bytes = await f2.read()

    if not f1_bytes:
        raise HTTPException(400, f"{f1.filename or 'File 1'} is empty.")
    if not f2_bytes:
        raise HTTPException(400, f"{f2.filename or 'File 2'} is empty.")

    meta = get_recon_metadata(recon_type)
    job_id = str(uuid.uuid4())

    # ── Parse based on recon_type ─────────────────────────────────────────────
    if recon_type == "gstr2b_pr":
        df1, err1 = parse_purchase_register(f1_bytes, f1.filename or "")
        df2, err2 = parse_gstr2b(f2_bytes, f2.filename or "")
        if err1: raise HTTPException(422, f"Purchase Register error: {err1}")
        if err2: raise HTTPException(422, f"GSTR-2B error: {err2}")
        result = reconcile(pr_df=df1, gstr2b_df=df2, period=period, gstin=gstin.upper().strip(), business_name=business_name or "My Business", job_id=job_id, recon_type=recon_type)

    elif recon_type == "gstr2a_gstr2b":
        df1, err1 = parse_gstr2a(f1_bytes, f1.filename or "")
        df2, err2 = parse_gstr2b(f2_bytes, f2.filename or "")
        if err1: raise HTTPException(422, f"GSTR-2A error: {err1}")
        if err2: raise HTTPException(422, f"GSTR-2B error: {err2}")
        result = reconcile(pr_df=df1, gstr2b_df=df2, period=period, gstin=gstin.upper().strip(), business_name=business_name or "My Business", job_id=job_id, recon_type=recon_type)

    elif recon_type == "gstr1_sales_register":
        df1, err1 = parse_sales_register(f1_bytes, f1.filename or "")
        df2, err2 = parse_gstr1(f2_bytes, f2.filename or "")
        if err1: raise HTTPException(422, f"Sales Register error: {err1}")
        if err2: raise HTTPException(422, f"GSTR-1 error: {err2}")
        result = reconcile(pr_df=df1, gstr2b_df=df2, period=period, gstin=gstin.upper().strip(), business_name=business_name or "My Business", job_id=job_id, recon_type=recon_type)

    elif recon_type == "ims_gstr2b":
        df1, err1 = parse_ims(f1_bytes, f1.filename or "")
        df2, err2 = parse_gstr2b(f2_bytes, f2.filename or "")
        if err1: raise HTTPException(422, f"IMS Export error: {err1}")
        if err2: raise HTTPException(422, f"GSTR-2B error: {err2}")
        result = reconcile(pr_df=df1, gstr2b_df=df2, period=period, gstin=gstin.upper().strip(), business_name=business_name or "My Business", job_id=job_id, recon_type=recon_type)

    elif recon_type in ["gstr3b_gstr1", "gstr9_books", "gstr9c_books"]:
        s1, err1 = parse_return_summary(f1_bytes, f1.filename or "", return_type=recon_type)
        s2, err2 = parse_return_summary(f2_bytes, f2.filename or "", return_type=recon_type)
        if err1: raise HTTPException(422, f"File 1 error: {err1}")
        if err2: raise HTTPException(422, f"File 2 error: {err2}")
        result = reconcile(file1_summary=s1, file2_summary=s2, period=period, gstin=gstin.upper().strip(), business_name=business_name or "My Business", job_id=job_id, recon_type=recon_type)

    else:
        # Fallback to default
        df1, err1 = parse_purchase_register(f1_bytes, f1.filename or "")
        df2, err2 = parse_gstr2b(f2_bytes, f2.filename or "")
        if err1: raise HTTPException(422, f"File 1 error: {err1}")
        if err2: raise HTTPException(422, f"File 2 error: {err2}")
        result = reconcile(pr_df=df1, gstr2b_df=df2, period=period, gstin=gstin.upper().strip(), business_name=business_name or "My Business", job_id=job_id, recon_type="gstr2b_pr")

    # ── Store in Supabase / JobStore ──────────────────────────────────────────
    store.save(job_id, result, user_id or None)

    return UploadResponse(
        jobId     = job_id,
        reconType = recon_type,
        message   = f"Reconciliation complete. {result.summary.totalInvoices} records processed.",
    )
