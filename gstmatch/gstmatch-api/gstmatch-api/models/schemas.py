from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


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


class Supplier(BaseModel):
    name:         str
    gstin:        str
    invoiceCount: int
    status:       SupplierStatus
    itcAtRisk:    float


class ReconciliationSummary(BaseModel):
    matched:          int
    mismatched:       int
    missingInGstr2b:  int
    missingInPr:      int
    totalItcAtRisk:   float
    totalInvoices:    int
    complianceScore:  int   # 0-100


class ReconciliationResult(BaseModel):
    id:           str
    period:       str
    gstin:        str
    businessName: str
    processedAt:  str
    summary:      ReconciliationSummary
    suppliers:    List[Supplier]
    invoices:     List[InvoiceRow]


class UploadResponse(BaseModel):
    jobId:   str
    message: str


class ErrorResponse(BaseModel):
    detail: str
