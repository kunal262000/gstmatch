"""
NEW FILE — place at: gstmatch-api/gstmatch-api/core/invoice_reconciler.py

Generalised version of core/reconciler.py's reconcile() function, used for
the 3 NEW invoice-level types: GSTR-2A vs GSTR-2B, GSTR-1 vs Sales
Register, IMS vs GSTR-2B.

⚠️ core/reconciler.py itself is left completely untouched and keeps being
used for gstr2b_vs_pr exactly as it works today — zero risk to the live
type. This file is purely additive.

Deliberately imports and reuses extract_gstin_state_code /
get_gstin_state_name from core/reconciler.py rather than redefining the
INDIAN_STATES table — there must only ever be one copy of that mapping.

Adds one new capability over the original: imsStatus pass-through on
InvoiceRow, populated only when reconciling IMS vs GSTR-2B (harmless
None for the other two new types).
"""
import uuid
from datetime import datetime
from typing import Dict, List, Tuple
import pandas as pd
from rapidfuzz import fuzz

from core.normalizer import (
    normalize_gstin, normalize_invoice_no,
    normalize_amount, normalize_date, make_match_key,
)
from core.reconciler import extract_gstin_state_code, get_gstin_state_name
from models.schemas import (
    InvoiceRow, InvoiceCategory, Supplier, SupplierStatus,
    ReconciliationResult, ReconciliationSummary, ReconType,
)

AMOUNT_TOLERANCE = 2.0
FUZZY_THRESHOLD  = 85


def _row_to_dict(row: pd.Series) -> dict:
    return {
        "gstin":          normalize_gstin(row.get("gstin", "")),
        "supplier_name":  str(row.get("supplier_name", "Unknown")),
        "invoice_no_raw": str(row.get("invoice_no", "")),
        "invoice_no":     normalize_invoice_no(row.get("invoice_no", "")),
        "invoice_date":   normalize_date(row.get("invoice_date", "")),
        "taxable_amt":    normalize_amount(row.get("taxable_amt", 0)),
        "igst":           normalize_amount(row.get("igst", 0)),
        "cgst":           normalize_amount(row.get("cgst", 0)),
        "sgst":           normalize_amount(row.get("sgst", 0)),
        "total":          normalize_amount(row.get("total", 0)),
        "action":         str(row.get("action", "") or ""),
    }


def _amounts_match(a: float, b: float) -> bool:
    return abs(a - b) <= AMOUNT_TOLERANCE


def _to_invoice_row(f1: dict | None, f2: dict | None, category: InvoiceCategory) -> InvoiceRow:
    base = f1 if f1 else f2
    your_amount  = f1["total"] if f1 else 0.0
    other_amount = f2["total"] if f2 else None
    difference   = None

    if f1 and f2:
        diff = round(your_amount - other_amount, 2)
        difference = diff if abs(diff) > AMOUNT_TOLERANCE else 0.0

    ims_status = None
    for src in (f1, f2):
        if src and src.get("action"):
            ims_status = src["action"]

    return InvoiceRow(
        supplierName = base["supplier_name"],
        gstin        = base["gstin"],
        invoiceNo    = base["invoice_no_raw"],
        invoiceDate  = base["invoice_date"],
        yourAmount   = your_amount,
        gstr2bAmount = other_amount,
        difference   = difference,
        category     = category,
        igst         = base["igst"],
        cgst         = base["cgst"],
        sgst         = base["sgst"],
        imsStatus    = ims_status,
    )


def reconcile_invoices(
    file1_df:      pd.DataFrame,
    file2_df:      pd.DataFrame,
    recon_type:    ReconType,
    period:        str,
    gstin:         str,
    business_name: str,
    job_id:        str | None = None,
) -> ReconciliationResult:
    """Same three-level matching algorithm as core/reconciler.py's
    reconcile(), generalised to work on any two invoice-level DataFrames."""

    if not job_id:
        job_id = str(uuid.uuid4())

    f1_rows = [_row_to_dict(row) for _, row in file1_df.iterrows()]
    f2_rows = [_row_to_dict(row) for _, row in file2_df.iterrows()]

    f1_lookup: Dict[str, dict] = {}
    f2_lookup: Dict[str, dict] = {}
    for r in f1_rows:
        f1_lookup[make_match_key(r["gstin"], r["invoice_no"])] = r
    for r in f2_rows:
        f2_lookup[make_match_key(r["gstin"], r["invoice_no"])] = r

    matched_keys: set = set()
    invoice_rows: List[InvoiceRow] = []

    # Level 1 — exact
    for key, f1_row in f1_lookup.items():
        if key in f2_lookup:
            f2_row = f2_lookup[key]
            cat = InvoiceCategory.matched if _amounts_match(f1_row["total"], f2_row["total"]) \
                else InvoiceCategory.mismatched
            invoice_rows.append(_to_invoice_row(f1_row, f2_row, cat))
            matched_keys.add(key)

    unmatched_f1 = {k: v for k, v in f1_lookup.items() if k not in matched_keys}
    unmatched_f2 = {k: v for k, v in f2_lookup.items() if k not in matched_keys}

    # Level 2 — fuzzy, grouped by GSTIN
    fuzzy_f1: set = set()
    fuzzy_f2: set = set()

    f1_by_gstin: Dict[str, List[Tuple[str, dict]]] = {}
    f2_by_gstin: Dict[str, List[Tuple[str, dict]]] = {}
    for key, row in unmatched_f1.items():
        f1_by_gstin.setdefault(row["gstin"], []).append((key, row))
    for key, row in unmatched_f2.items():
        f2_by_gstin.setdefault(row["gstin"], []).append((key, row))

    for gstin_key, f1_list in f1_by_gstin.items():
        if gstin_key not in f2_by_gstin:
            continue
        f2_list = f2_by_gstin[gstin_key]

        for f1_key, f1_row in f1_list:
            if f1_key in fuzzy_f1:
                continue
            best_score, best_row, best_key = 0, None, None
            for f2_key, f2_row in f2_list:
                if f2_key in fuzzy_f2:
                    continue
                score = fuzz.ratio(f1_row["invoice_no"], f2_row["invoice_no"])
                if score > best_score and score >= FUZZY_THRESHOLD:
                    best_score, best_row, best_key = score, f2_row, f2_key

            if best_row:
                cat = InvoiceCategory.matched if _amounts_match(f1_row["total"], best_row["total"]) \
                    else InvoiceCategory.mismatched
                invoice_rows.append(_to_invoice_row(f1_row, best_row, cat))
                fuzzy_f1.add(f1_key)
                fuzzy_f2.add(best_key)

    # Level 3 — remaining = missing
    for f1_key, f1_row in unmatched_f1.items():
        if f1_key not in fuzzy_f1:
            invoice_rows.append(_to_invoice_row(f1_row, None, InvoiceCategory.missing_in_gstr2b))
    for f2_key, f2_row in unmatched_f2.items():
        if f2_key not in fuzzy_f2:
            invoice_rows.append(_to_invoice_row(None, f2_row, InvoiceCategory.missing_in_pr))

    # ── Summary ──
    counts = {cat: 0 for cat in InvoiceCategory}
    itc_at_risk = 0.0
    for inv in invoice_rows:
        counts[inv.category] += 1
        if inv.category == InvoiceCategory.missing_in_gstr2b:
            itc_at_risk += inv.igst + inv.cgst + inv.sgst

    total_invoices = len(invoice_rows)
    matched_count  = counts[InvoiceCategory.matched]
    compliance     = round((matched_count / total_invoices * 100)) if total_invoices else 0

    summary = ReconciliationSummary(
        matched         = counts[InvoiceCategory.matched],
        mismatched      = counts[InvoiceCategory.mismatched],
        missingInGstr2b = counts[InvoiceCategory.missing_in_gstr2b],
        missingInPr     = counts[InvoiceCategory.missing_in_pr],
        totalItcAtRisk  = round(itc_at_risk, 2),
        totalInvoices   = total_invoices,
        complianceScore = compliance,
    )

    # ── Suppliers — same stateCode/stateName enrichment as the original engine ──
    supplier_map: Dict[str, dict] = {}
    for inv in invoice_rows:
        g = inv.gstin
        if g not in supplier_map:
            supplier_map[g] = {
                "name": inv.supplierName, "gstin": g, "invoiceCount": 0,
                "itcAtRisk": 0.0, "has_mismatch": False, "has_missing": False,
            }
        supplier_map[g]["invoiceCount"] += 1
        if inv.category == InvoiceCategory.missing_in_gstr2b:
            supplier_map[g]["itcAtRisk"]  += inv.igst + inv.cgst + inv.sgst
            supplier_map[g]["has_missing"] = True
        elif inv.category == InvoiceCategory.mismatched:
            supplier_map[g]["has_mismatch"] = True

    suppliers: List[Supplier] = []
    for g, s in supplier_map.items():
        status = (SupplierStatus.not_filed if s["has_missing"]
                 else SupplierStatus.mismatch if s["has_mismatch"]
                 else SupplierStatus.filed)
        suppliers.append(Supplier(
            name=s["name"], gstin=g, invoiceCount=s["invoiceCount"],
            status=status, itcAtRisk=round(s["itcAtRisk"], 2),
            stateCode=extract_gstin_state_code(g),
            stateName=get_gstin_state_name(g),
        ))
    suppliers.sort(key=lambda x: (-x.itcAtRisk, x.name))

    return ReconciliationResult(
        id=job_id, reconType=recon_type, engine="invoice",
        period=period, gstin=gstin, businessName=business_name,
        processedAt=datetime.utcnow().isoformat(),
        summary=summary, suppliers=suppliers, invoices=invoice_rows,
    )
