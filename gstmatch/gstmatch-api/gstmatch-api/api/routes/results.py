from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from models.schemas import ReconciliationResult
from reports.excel_report import generate_excel_report as generate_excel
from reports.pdf_report import generate_pdf
import storage.job_store as store
from core.auth import current_user_or_401

router = APIRouter()


def _get_or_404(job_id: str, user_id: str | None = None) -> ReconciliationResult:
    """
    Fetch a result by job ID, enforcing ownership.

    - In production (SUPABASE_JWT_SECRET set): user_id is the authenticated user;
      the result is rejected with 403 if it belongs to a different user.
    - In dev (no JWT secret): user_id is None, ownership is not enforced so local
      demoing from the browser keeps working against the in-memory store.
    """
    # Try in-memory + Supabase (store.get also fetches ownership-aware rows)
    result, owner_id = store.get_with_owner(job_id)
    if not result:
        raise HTTPException(404, f"No result found for job ID: {job_id}")

    # Enforce ownership when an authenticated user is present.
    if user_id is not None and owner_id is not None and owner_id != user_id:
        raise HTTPException(403, "You do not have access to this resource")
    return result


@router.get("/results/{job_id}", response_model=ReconciliationResult)
def get_result(job_id: str, user_id: str | None = Depends(current_user_or_401)):
    """Return full reconciliation result as JSON."""
    return _get_or_404(job_id, user_id)


@router.get("/results/{job_id}/excel")
def download_excel(job_id: str, user_id: str | None = Depends(current_user_or_401)):
    """Stream Excel report as downloadable file."""
    result = _get_or_404(job_id, user_id)
    try:
        xlsx_bytes = generate_excel(result)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate Excel: {str(e)}")

    filename = f"GST_Report_{result.period.replace(' ', '_')}_{job_id[:8]}.xlsx"
    return Response(
        content     = xlsx_bytes,
        media_type  = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers     = {"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/results/{job_id}/pdf")
def download_pdf(job_id: str, user_id: str | None = Depends(current_user_or_401)):
    """Stream PDF summary as downloadable file."""
    result = _get_or_404(job_id, user_id)
    try:
        pdf_bytes = generate_pdf(result)
    except Exception as e:
        raise HTTPException(500, f"Failed to generate PDF: {str(e)}")

    filename = f"GST_Summary_{result.period.replace(' ', '_')}_{job_id[:8]}.pdf"
    return Response(
        content     = pdf_bytes,
        media_type  = "application/pdf",
        headers     = {"Content-Disposition": f'attachment; filename="{filename}"'},
    )
