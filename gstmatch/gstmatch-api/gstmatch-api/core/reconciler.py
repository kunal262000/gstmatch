"""
Reconciliation engine — matches Purchase Register vs GSTR-2B.

Three matching levels:
  Level 1 — Exact:  GSTIN + normalised invoice no (fast dict lookup)
  Level 2 — Fuzzy:  GSTIN + invoice no similarity ≥ 85 % (rapidfuzz)
  Level 3 — Classify remaining as missing_in_gstr2b / missing_in_pr
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
from models.schemas import (
    InvoiceRow, InvoiceCategory, Supplier, SupplierStatus,
    ReconciliationResult, ReconciliationSummary,
)

AMOUNT_TOLERANCE = 2.0   # ₹2 rounding tolerance for exact match
FUZZY_THRESHOLD  = 85    # minimum similarity score for fuzzy match


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _row_to_dict(row: pd.Series, source: str) -> dict:
    return {
        "gstin":         normalize_gstin(row.get("gstin", "")),
        "supplier_name": str(row.get("supplier_name", "Unknown")),
        "invoice_no_raw": str(row.get("invoice_no", "")),
        "invoice_no":    normalize_invoice_no(row.get("invoice_no", "")),
        "invoice_date":  normalize_date(row.get("invoice_date", "")),
        "taxable_amt":   normalize_amount(row.get("taxable_amt", 0)),
        "igst":          normalize_amount(row.get("igst", 0)),
        "cgst":          normalize_amount(row.get("cgst", 0)),
        "sgst":          normalize_amount(row.get("sgst", 0)),
        "total":         normalize_amount(row.get("total", 0)),
        "source":        source,
    }


def _amounts_match(pr_total: float, g2b_total: float) -> bool:
    return abs(pr_total - g2b_total) <= AMOUNT_TOLERANCE


def _to_invoice_row(pr: dict, g2b: dict | None, category: InvoiceCategory) -> InvoiceRow:
    base = pr if pr else g2b
    your_amount   = pr["total"]   if pr  else 0.0
    gstr2b_amount = g2b["total"]  if g2b else None
    difference    = None

    if pr and g2b:
        diff = round(your_amount - gstr2b_amount, 2)
        difference = diff if abs(diff) > AMOUNT_TOLERANCE else 0.0

    return InvoiceRow(
        supplierName  = base["supplier_name"],
        gstin         = base["gstin"],
        invoiceNo     = base["invoice_no_raw"],
        invoiceDate   = base["invoice_date"],
        yourAmount    = your_amount,
        gstr2bAmount  = gstr2b_amount,
        difference    = difference,
        category      = category,
        igst          = base["igst"],
        cgst          = base["cgst"],
        sgst          = base["sgst"],
    )


# ─── Main reconcile function ───────────────────────────────────────────────────

def reconcile(
    pr_df:        pd.DataFrame,
    gstr2b_df:    pd.DataFrame,
    period:       str,
    gstin:        str,
    business_name: str,
    job_id:       str | None = None,
) -> ReconciliationResult:

    if not job_id:
        job_id = str(uuid.uuid4())

    # Convert to list of dicts
    pr_rows    = [_row_to_dict(row, "pr")    for _, row in pr_df.iterrows()]
    gstr2b_rows = [_row_to_dict(row, "g2b") for _, row in gstr2b_df.iterrows()]

    # Build lookup dicts keyed by GSTIN|NormalisedInvoiceNo
    pr_lookup:    Dict[str, dict] = {}
    gstr2b_lookup: Dict[str, dict] = {}

    for r in pr_rows:
        key = make_match_key(r["gstin"], r["invoice_no"])
        pr_lookup[key] = r

    for r in gstr2b_rows:
        key = make_match_key(r["gstin"], r["invoice_no"])
        gstr2b_lookup[key] = r

    matched_keys:   set = set()
    invoice_rows:   List[InvoiceRow] = []

    # ── Level 1: Exact match ──────────────────────────────────────────────────
    for key, pr_row in pr_lookup.items():
        if key in gstr2b_lookup:
            g2b_row = gstr2b_lookup[key]
            if _amounts_match(pr_row["total"], g2b_row["total"]):
                invoice_rows.append(_to_invoice_row(pr_row, g2b_row, InvoiceCategory.matched))
            else:
                invoice_rows.append(_to_invoice_row(pr_row, g2b_row, InvoiceCategory.mismatched))
            matched_keys.add(key)

    # Unmatched after Level 1
    unmatched_pr    = {k: v for k, v in pr_lookup.items()    if k not in matched_keys}
    unmatched_gstr2b = {k: v for k, v in gstr2b_lookup.items() if k not in matched_keys}

    # ── Level 2: Fuzzy match on same GSTIN ───────────────────────────────────
    fuzzy_matched_pr_keys:    set = set()
    fuzzy_matched_g2b_keys:   set = set()

    # Group unmatched by GSTIN for efficiency
    pr_by_gstin:    Dict[str, List[Tuple[str, dict]]] = {}
    g2b_by_gstin:   Dict[str, List[Tuple[str, dict]]] = {}

    for key, row in unmatched_pr.items():
        pr_by_gstin.setdefault(row["gstin"], []).append((key, row))
    for key, row in unmatched_gstr2b.items():
        g2b_by_gstin.setdefault(row["gstin"], []).append((key, row))

    for gstin_key, pr_list in pr_by_gstin.items():
        if gstin_key not in g2b_by_gstin:
            continue
        g2b_list = g2b_by_gstin[gstin_key]

        for pr_key, pr_row in pr_list:
            if pr_key in fuzzy_matched_pr_keys:
                continue
            best_score  = 0
            best_g2b    = None
            best_g2b_key = None

            for g2b_key, g2b_row in g2b_list:
                if g2b_key in fuzzy_matched_g2b_keys:
                    continue
                score = fuzz.ratio(pr_row["invoice_no"], g2b_row["invoice_no"])
                if score > best_score and score >= FUZZY_THRESHOLD:
                    best_score   = score
                    best_g2b     = g2b_row
                    best_g2b_key = g2b_key

            if best_g2b:
                if _amounts_match(pr_row["total"], best_g2b["total"]):
                    invoice_rows.append(_to_invoice_row(pr_row, best_g2b, InvoiceCategory.matched))
                else:
                    invoice_rows.append(_to_invoice_row(pr_row, best_g2b, InvoiceCategory.mismatched))
                fuzzy_matched_pr_keys.add(pr_key)
                fuzzy_matched_g2b_keys.add(best_g2b_key)

    # ── Level 3: Remaining = missing ─────────────────────────────────────────
    for pr_key, pr_row in unmatched_pr.items():
        if pr_key not in fuzzy_matched_pr_keys:
            invoice_rows.append(_to_invoice_row(pr_row, None, InvoiceCategory.missing_in_gstr2b))

    for g2b_key, g2b_row in unmatched_gstr2b.items():
        if g2b_key not in fuzzy_matched_g2b_keys:
            invoice_rows.append(_to_invoice_row(None, g2b_row, InvoiceCategory.missing_in_pr))

    # ── Build summary ─────────────────────────────────────────────────────────
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
        matched          = counts[InvoiceCategory.matched],
        mismatched       = counts[InvoiceCategory.mismatched],
        missingInGstr2b  = counts[InvoiceCategory.missing_in_gstr2b],
        missingInPr      = counts[InvoiceCategory.missing_in_pr],
        totalItcAtRisk   = round(itc_at_risk, 2),
        totalInvoices    = total_invoices,
        complianceScore  = compliance,
    )

    # ── Build supplier list ───────────────────────────────────────────────────
    supplier_map: Dict[str, dict] = {}

    for inv in invoice_rows:
        g = inv.gstin
        if g not in supplier_map:
            supplier_map[g] = {
                "name":         inv.supplierName,
                "gstin":        g,
                "invoiceCount": 0,
                "itcAtRisk":    0.0,
                "has_mismatch": False,
                "has_missing":  False,
                "has_match":    False,
            }
        supplier_map[g]["invoiceCount"] += 1
        if inv.category == InvoiceCategory.missing_in_gstr2b:
            supplier_map[g]["itcAtRisk"]   += inv.igst + inv.cgst + inv.sgst
            supplier_map[g]["has_missing"]  = True
        elif inv.category == InvoiceCategory.mismatched:
            supplier_map[g]["has_mismatch"] = True
        elif inv.category == InvoiceCategory.matched:
            supplier_map[g]["has_match"]    = True

    suppliers: List[Supplier] = []
    for g, s in supplier_map.items():
        if s["has_missing"]:
            status = SupplierStatus.not_filed
        elif s["has_mismatch"]:
            status = SupplierStatus.mismatch
        else:
            status = SupplierStatus.filed

        suppliers.append(Supplier(
            name         = s["name"],
            gstin        = g,
            invoiceCount = s["invoiceCount"],
            status       = status,
            itcAtRisk    = round(s["itcAtRisk"], 2),
        ))

    suppliers.sort(key=lambda x: (-x.itcAtRisk, x.name))

    return ReconciliationResult(
        id           = job_id,
        period       = period,
        gstin        = gstin,
        businessName = business_name,
        processedAt  = datetime.utcnow().isoformat(),
        summary      = summary,
        suppliers    = suppliers,
        invoices     = invoice_rows,
    )
