"""
MODIFIED FILE — replaces: gstmatch-api/gstmatch-api/api/routes/results.py

Your exact auth/ownership pattern is UNCHANGED — same
Depends(current_user_or_401), same 403-on-owner-mismatch logic in
_get_or_404(). It now checks BOTH the invoice-result store and the
summary-result store (via store.get_with_owner() then
store.get_summary_with_owner()) since a job_id could belong to either
depending on which reconciliation type was run.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from models.schemas import ReconciliationResult, SummaryReconciliationResult
from reports.excel_report import generate_excel
from reports.pdf_report import generate_pdf
from reports.summary_excel_report import generate_summary_excel
from reports.summary_pdf_report import generate_summary_pdf
import storage.job_store as store
from core.auth import current_user_or_401

router = APIRouter()


def _get_or_404(job_id: str, user_id: str | None = None):
    """
    Fetch a result by job ID, enforcing ownership — same logic as your
    original, extended to check both result stores.

    Returns whichever type was found: ReconciliationResult (invoice engine)
    or SummaryReconciliationResult (summary engine). Caller should check
    `.engine` to know which shape it got.
    """
    result, owner_id = store.get_with_owner(job_id)

    if not result:
        result, owner_id = store.get_summary_with_owner(job_id)

    if not result:
        raise HTTPException(404, f"No result found for job ID: {job_id}")

    # Enforce ownership when an authenticated user is present.
    # UNCHANGED from your original.
    if user_id is not None and owner_id is not None and owner_id != user_id:
        raise HTTPException(403, "You do not have access to this resource")

    return result


@router.get("/results/{job_id}")
def get_result(job_id: str, user_id: str | None = Depends(current_user_or_401)):
    """Return either ReconciliationResult or SummaryReconciliationResult —
    check the `engine` field in the response to know which shape it is."""
    return _get_or_404(job_id, user_id)


@router.get("/results/{job_id}/excel")
def download_excel(job_id: str, user_id: str | None = Depends(current_user_or_401)):
    """Stream Excel report as downloadable file."""
    result = _get_or_404(job_id, user_id)
    try:
        if isinstance(result, SummaryReconciliationResult) or getattr(result, "engine", "invoice") == "summary":
            xlsx_bytes = generate_summary_excel(result)
        else:
            xlsx_bytes = generate_excel(result)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate Excel: {str(e)}")

    filename = f"GST_Report_{result.period.replace(' ', '_')}_{job_id[:8]}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/results/{job_id}/pdf")
def download_pdf(job_id: str, user_id: str | None = Depends(current_user_or_401)):
    """Stream PDF summary as downloadable file."""
    result = _get_or_404(job_id, user_id)
    try:
        if isinstance(result, SummaryReconciliationResult) or getattr(result, "engine", "invoice") == "summary":
            pdf_bytes = generate_summary_pdf(result)
        else:
            pdf_bytes = generate_pdf(result)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate PDF: {str(e)}")

    filename = f"GST_Summary_{result.period.replace(' ', '_')}_{job_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
