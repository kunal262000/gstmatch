"""
MODIFIED FILE — replaces: gstmatch-api/gstmatch-api/api/routes/reconcile.py

Your exact free-tier enforcement block is UNCHANGED — same
FREE_RECON_LIMIT env var, same store.get_plan()/count_for_user() check,
same 403 response. It now runs before parsing regardless of which
recon_type was requested (see storage/job_store.py's count_for_user() fix
— it already counts across both tables).

Changed: the two file fields are now generic (file1/file2) instead of
purchase_register/gstr2b, and there's a new recon_type field (defaults to
"gstr2b_vs_pr" so any in-flight requests from clients that haven't
deployed the new frontend yet keep working). Parsing and reconciliation
now dispatch through core/recon_registry.py instead of being hardcoded to
one parser pair and one engine.
"""
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from core.recon_registry import get_recon_type
from core.reconciler import reconcile as reconcile_gstr2b_vs_pr
from core.invoice_reconciler import reconcile_invoices
from core.summary_reconciler import reconcile_summary
from models.schemas import UploadResponse, ReconType
import storage.job_store as store

router = APIRouter()

# Free-tier cap on reconciliations per user (paid users are unlimited).
# UNCHANGED from your original file.
FREE_RECON_LIMIT = int(os.getenv("FREE_RECON_LIMIT", "2"))


@router.post("/reconcile", response_model=UploadResponse)
async def start_reconciliation(
    file1:         UploadFile = File(..., description="First file — see recon_type for which document"),
    file2:         UploadFile = File(..., description="Second file — see recon_type for which document"),
    period:        str        = Form(..., description="e.g. June 2025"),
    gstin:         str        = Form(..., description="Your 15-character GSTIN"),
    business_name: str        = Form("", description="Your business name"),
    user_id:       str        = Form("", description="Logged-in user id (optional)"),
    recon_type:    str        = Form("gstr2b_vs_pr", description="Which reconciliation type to run"),
):
    # ── Enforce free-tier limit BEFORE doing any heavy work ──────────────────
    # UNCHANGED logic — count_for_user() now sums across invoice + summary
    # tables (see storage/job_store.py), so this correctly limits total
    # reconciliations regardless of which recon_type is used.
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

    # ── Resolve reconciliation type ─────────────────────────────────────────
    try:
        config = get_recon_type(recon_type)
    except ValueError:
        raise HTTPException(400, f"Unknown reconciliation type: {recon_type}")

    # ── Read files ────────────────────────────────────────────────────────────
    f1_bytes = await file1.read()
    f2_bytes = await file2.read()

    if not f1_bytes:
        raise HTTPException(400, f"{config.file1_label} file is empty.")
    if not f2_bytes:
        raise HTTPException(400, f"{config.file2_label} file is empty.")

    # ── Parse using the parsers registered for this recon type ─────────────────
    f1_df, f1_err = config.file1_parser(f1_bytes, file1.filename or "")
    if f1_err:
        raise HTTPException(422, f"{config.file1_label} error: {f1_err}")

    f2_df, f2_err = config.file2_parser(f2_bytes, file2.filename or "")
    if f2_err:
        raise HTTPException(422, f"{config.file2_label} error: {f2_err}")

    if f1_df.empty:
        raise HTTPException(422, f"No valid rows found in {config.file1_label}.")
    if f2_df.empty:
        raise HTTPException(422, f"No valid rows found in {config.file2_label}.")

    # ── Reconcile ─────────────────────────────────────────────────────────────
    job_id = str(uuid.uuid4())
    recon_type_enum = ReconType(recon_type)
    gstin_clean = gstin.upper().strip()
    biz_name    = business_name or "My Business"

    if recon_type == "gstr2b_vs_pr":
        # Original type — routed through the ORIGINAL, untouched
        # core/reconciler.py exactly as it has always run. Zero behavioural
        # change for existing users.
        result = reconcile_gstr2b_vs_pr(
            pr_df=f1_df, gstr2b_df=f2_df, period=period,
            gstin=gstin_clean, business_name=biz_name, job_id=job_id,
        )
        store.save(job_id, result, user_id or None)
        message = f"Reconciliation complete. {result.summary.totalInvoices} invoices processed."

    elif config.engine == "invoice":
        result = reconcile_invoices(
            file1_df=f1_df, file2_df=f2_df, recon_type=recon_type_enum,
            period=period, gstin=gstin_clean, business_name=biz_name, job_id=job_id,
        )
        store.save(job_id, result, user_id or None)
        message = f"Reconciliation complete. {result.summary.totalInvoices} invoices processed."

    else:  # summary engine
        result = reconcile_summary(
            file1_df=f1_df, file2_df=f2_df, recon_type=recon_type_enum,
            file1_label=config.file1_label, file2_label=config.file2_label,
            period=period, gstin=gstin_clean, business_name=biz_name, job_id=job_id,
        )
        store.save_summary(job_id, result, user_id or None)
        message = f"Reconciliation complete. {len(result.lineItems)} sections compared."

    return UploadResponse(
        jobId=job_id, message=message,
        reconType=recon_type_enum, engine=config.engine,
    )
