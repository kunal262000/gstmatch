"""
NEW FILE — place at: gstmatch-api/gstmatch-api/api/routes/recon_types.py

Serves reconciliation type metadata so the frontend type-selector stays in
sync with what the backend actually supports.
"""
from fastapi import APIRouter

from core.recon_registry import list_recon_types
from models.schemas import ReconTypeInfo

router = APIRouter()


@router.get("/reconciliation-types", response_model=list[ReconTypeInfo])
def get_reconciliation_types():
    return [
        ReconTypeInfo(
            id=t.id, name=t.name, shortName=t.short_name,
            description=t.description, icon=t.icon, engine=t.engine,
            file1Label=t.file1_label, file2Label=t.file2_label,
            file1Hint=t.file1_hint, file2Hint=t.file2_hint, badge=t.badge,
        )
        for t in list_recon_types()
    ]
