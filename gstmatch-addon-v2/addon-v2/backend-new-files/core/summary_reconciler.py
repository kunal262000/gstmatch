"""
NEW FILE — place at: gstmatch-api/gstmatch-api/core/summary_reconciler.py

Summary-level reconciliation engine for GSTR-3B vs GSTR-1, GSTR-1 vs
GSTR-3B, GSTR-9 vs Books, GSTR-9C vs Books.

Matches SECTIONS (e.g. "Outward taxable supplies") between two documents
rather than individual invoices. Section labels rarely match exactly
between two different return types, so matching uses fuzzy string
similarity on the label — same rapidfuzz library already used by the
invoice engine, just applied to section names instead of invoice numbers.
"""
import uuid
from datetime import datetime
from typing import List
import pandas as pd
from rapidfuzz import fuzz

from models.schemas import SummaryLineItem, SummaryReconciliationResult, ReconType

AMOUNT_TOLERANCE = 5.0   # ₹5 tolerance for summary-level rounding
LABEL_MATCH_MIN  = 55    # lower than invoice matching — section names vary more


def _normalize_label(label: str) -> str:
    return label.strip().lower()


def reconcile_summary(
    file1_df:      pd.DataFrame,
    file2_df:      pd.DataFrame,
    recon_type:    ReconType,
    file1_label:   str,
    file2_label:   str,
    period:        str,
    gstin:         str,
    business_name: str,
    job_id:        str | None = None,
) -> SummaryReconciliationResult:

    if not job_id:
        job_id = str(uuid.uuid4())

    f1_sections = file1_df.to_dict("records")
    f2_sections = file2_df.to_dict("records")

    used_f2_idx: set = set()
    line_items: List[SummaryLineItem] = []

    for f1_row in f1_sections:
        f1_label_norm = _normalize_label(f1_row["section"])

        best_score, best_idx = 0, None
        for i, f2_row in enumerate(f2_sections):
            if i in used_f2_idx:
                continue
            score = fuzz.token_sort_ratio(f1_label_norm, _normalize_label(f2_row["section"]))
            if score > best_score:
                best_score, best_idx = score, i

        if best_idx is not None and best_score >= LABEL_MATCH_MIN:
            f2_row = f2_sections[best_idx]
            used_f2_idx.add(best_idx)

            f1_total = round(float(f1_row.get("total", 0)), 2)
            f2_total = round(float(f2_row.get("total", 0)), 2)
            diff     = round(f1_total - f2_total, 2)

            line_items.append(SummaryLineItem(
                section    = str(f1_row["section"]),
                file1Value = f1_total,
                file2Value = f2_total,
                difference = diff,
                igstDiff   = round(float(f1_row.get("igst", 0)) - float(f2_row.get("igst", 0)), 2),
                cgstDiff   = round(float(f1_row.get("cgst", 0)) - float(f2_row.get("cgst", 0)), 2),
                sgstDiff   = round(float(f1_row.get("sgst", 0)) - float(f2_row.get("sgst", 0)), 2),
                status     = "matched" if abs(diff) <= AMOUNT_TOLERANCE else "mismatch",
            ))
        else:
            f1_total = round(float(f1_row.get("total", 0)), 2)
            line_items.append(SummaryLineItem(
                section    = str(f1_row["section"]),
                file1Value = f1_total, file2Value = 0.0, difference = f1_total,
                igstDiff   = round(float(f1_row.get("igst", 0)), 2),
                cgstDiff   = round(float(f1_row.get("cgst", 0)), 2),
                sgstDiff   = round(float(f1_row.get("sgst", 0)), 2),
                status     = "mismatch",
            ))

    for i, f2_row in enumerate(f2_sections):
        if i in used_f2_idx:
            continue
        f2_total = round(float(f2_row.get("total", 0)), 2)
        line_items.append(SummaryLineItem(
            section    = str(f2_row["section"]),
            file1Value = 0.0, file2Value = f2_total, difference = -f2_total,
            igstDiff   = -round(float(f2_row.get("igst", 0)), 2),
            cgstDiff   = -round(float(f2_row.get("cgst", 0)), 2),
            sgstDiff   = -round(float(f2_row.get("sgst", 0)), 2),
            status     = "mismatch",
        ))

    total_f1 = round(sum(li.file1Value for li in line_items), 2)
    total_f2 = round(sum(li.file2Value for li in line_items), 2)
    matched_count    = sum(1 for li in line_items if li.status == "matched")
    mismatched_count = len(line_items) - matched_count
    compliance       = round((matched_count / len(line_items) * 100)) if line_items else 0

    return SummaryReconciliationResult(
        id=job_id, reconType=recon_type, engine="summary",
        period=period, gstin=gstin, businessName=business_name,
        processedAt=datetime.utcnow().isoformat(),
        file1Label=file1_label, file2Label=file2_label,
        totalFile1Value=total_f1, totalFile2Value=total_f2,
        totalDifference=round(total_f1 - total_f2, 2),
        matchedSections=matched_count, mismatchedSections=mismatched_count,
        complianceScore=compliance, lineItems=line_items,
    )
