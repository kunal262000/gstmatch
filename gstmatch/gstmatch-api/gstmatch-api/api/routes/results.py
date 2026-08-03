from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from models.schemas import ReconciliationResult
from reports.excel_report import generate_excel
from reports.pdf_report import generate_pdf
import storage.job_store as store

router = APIRouter()


def _get_or_404(job_id: str) -> ReconciliationResult:
    result = store.get(job_id)
    if not result:
        raise HTTPException(404, f"No result found for job ID: {job_id}")
    return result


@router.get("/results/{job_id}", response_model=ReconciliationResult)
def get_result(job_id: str):
    """Return full reconciliation result as JSON."""
    return _get_or_404(job_id)


@router.get("/results/{job_id}/excel")
def download_excel(job_id: str):
    """Stream Excel report as downloadable file."""
    result = _get_or_404(job_id)
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
def download_pdf(job_id: str):
    """Stream PDF summary as downloadable file."""
    result = _get_or_404(job_id)
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
