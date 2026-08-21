"""
MODIFIED FILE — replaces: gstmatch-api/gstmatch-api/models/schemas.py

This is your EXACT original file with additions only. Every existing
field, including Supplier.stateCode/stateName, is untouched. Diff against
your original to confirm — nothing that currently constructs InvoiceRow,
Supplier, ReconciliationResult, or UploadResponse needs to change; the new
fields all have defaults.

Added:
  - ReconType enum (8 values)
  - InvoiceRow.imsStatus (optional, only populated for IMS vs GSTR-2B)
  - ReconciliationResult.reconType / .engine (defaulted to the original type
    so existing rows/responses are unaffected)
  - UploadResponse.reconType / .engine (same reasoning)
  - SummaryLineItem, SummaryReconciliationResult, ReconTypeInfo (new — for
    the 4 summary-engine reconciliation types)
"""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


# ── NEW ──
# ReconType: short-form ids are now canonical (matching lib/reconciliation-registry.ts
# used by the homepage/nav/dashboard/pricing/results/admin pages). Long-form "_vs_"
# ids are kept as valid alternate members so any already-stored Supabase rows or
# in-flight requests using the old scheme still parse successfully — see
# core/recon_registry.py's LEGACY_ALIASES for where the lookup normalization happens.
class ReconType(str, Enum):
    gstr2b_pr                = "gstr2b_pr"
    gstr2b_vs_pr             = "gstr2b_vs_pr"  # legacy alias
    gstr2a_gstr2b            = "gstr2a_gstr2b"
    gstr2a_vs_gstr2b         = "gstr2a_vs_gstr2b"  # legacy alias
    gstr1_sales_register     = "gstr1_sales_register"
    gstr1_vs_sales_register  = "gstr1_vs_sales_register"  # legacy alias
    ims_gstr2b               = "ims_gstr2b"
    ims_vs_gstr2b            = "ims_vs_gstr2b"  # legacy alias
    gstr3b_gstr1             = "gstr3b_gstr1"
    gstr3b_vs_gstr1          = "gstr3b_vs_gstr1"  # legacy alias
    gstr9_books              = "gstr9_books"
    gstr9_vs_books           = "gstr9_vs_books"  # legacy alias
    gstr9c_books             = "gstr9c_books"
    gstr9c_vs_books          = "gstr9c_vs_books"  # legacy alias


class InvoiceCategory(str, Enum):
    matched           = "matched"
    mismatched        = "mismatched"
    missing_in_gstr2b = "missing_in_gstr2b"   # in PR but supplier hasn't filed
    missing_in_pr     = "missing_in_pr"        # in GSTR-2B but not in your books


class SupplierStatus(str, Enum):
    filed     = "filed"
    not_filed = "not_filed"
    mismatch  = "mismatch"


class InvoiceRow(BaseModel):
    supplierName:  str
    gstin:         str
    invoiceNo:     str
    invoiceDate:   str
    yourAmount:    float
    gstr2bAmount:  Optional[float]
    difference:    Optional[float]
    category:      InvoiceCategory
    igst:          float
    cgst:          float
    sgst:          float
    imsStatus:     Optional[str] = None   # NEW — only set for IMS vs GSTR-2B


class Supplier(BaseModel):
    name:             str
    gstin:            str
    invoiceCount:     int
    status:           SupplierStatus
    itcAtRisk:        float
    stateCode:        str   # 2-digit GSTIN state code
    stateName:        str   # Full state/UT name


class ReconciliationSummary(BaseModel):
    matched:               int
    mismatched:            int
    missingInGstr2b:       int
    missingInPr:           int
    totalItcAtRisk:        float
    totalInvoices:         int
    complianceScore:       int   # 0-100
    # Legacy fields for backward compatibility
    financialMetricLabel:  Optional[str] = "Potential ITC at Risk"
    reconType:             Optional[str] = "gstr2b_pr"
    matchAccuracy:         Optional[float] = 0.0
    totalRecoveredOrValid: Optional[float] = 0.0
    financialDifference:   Optional[float] = 0.0


# ── Original summary section row (for GSTR-3B vs GSTR-1 legacy compatibility) ──
class SummarySectionRow(BaseModel):
    sectionId:         str
    sectionName:       str
    description:       str
    file1Value:        float = 0.0
    file2Value:        float = 0.0
    taxableDifference: float = 0.0
    igstDiff:          float = 0.0
    cgstDiff:          float = 0.0
    sgstDiff:          float = 0.0
    totalDifference:   float = 0.0
    status:            str = "matched"   # "matched", "mismatch", "missing_in_file1", "missing_in_file2"


class ReconciliationResult(BaseModel):
    id:           str
    period:       str
    gstin:        str
    businessName: str
    processedAt:  str
    summary:      ReconciliationSummary
    suppliers:    List[Supplier]
    invoices:     List[InvoiceRow]
    # NEW — defaulted so every existing row already in Supabase, and every
    # existing code path that builds this model, keeps working unchanged.
    reconType:    ReconType = ReconType.gstr2b_pr
    engine:       str       = "invoice"
    # Legacy field for summary-level reconciliations (GSTR-3B vs GSTR-1, etc.)
    summarySections: Optional[List[SummarySectionRow]] = None


# ── NEW — summary-engine result (GSTR-3B vs GSTR-1, GSTR-9 vs Books, etc.) ──
class SummaryLineItem(BaseModel):
    section:     str
    file1Value:  float
    file2Value:  float
    difference:  float
    igstDiff:    float
    cgstDiff:    float
    sgstDiff:    float
    status:      str   # "matched" | "mismatch"


class SummaryReconciliationResult(BaseModel):
    id:                 str
    reconType:          ReconType
    engine:             str = "summary"
    period:             str
    gstin:              str
    businessName:       str
    processedAt:        str
    file1Label:         str
    file2Label:         str
    totalFile1Value:    float
    totalFile2Value:    float
    totalDifference:    float
    matchedSections:    int
    mismatchedSections: int
    complianceScore:    int
    lineItems:          List[SummaryLineItem]


# ── NEW — reconciliation type metadata, served by GET /api/reconciliation-types ──
class ReconTypeInfo(BaseModel):
    id:          str
    name:        str
    shortName:   str
    description: str
    icon:        str
    engine:      str
    file1Label:  str
    file2Label:  str
    file1Hint:   str
    file2Hint:   str
    badge:       Optional[str] = None


class UploadResponse(BaseModel):
    jobId:      str
    message:    str
    reconType:  ReconType = ReconType.gstr2b_pr   # NEW, defaulted
    engine:     str       = "invoice"                 # NEW, defaulted


class ErrorResponse(BaseModel):
    detail: str
