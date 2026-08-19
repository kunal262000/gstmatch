from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class ReconciliationType(str, Enum):
    gstr2b_pr            = "gstr2b_pr"
    gstr2a_gstr2b        = "gstr2a_gstr2b"
    gstr1_sales_register = "gstr1_sales_register"
    ims_gstr2b           = "ims_gstr2b"
    gstr3b_gstr1         = "gstr3b_gstr1"
    gstr9_books          = "gstr9_books"
    gstr9c_books         = "gstr9c_books"


class InvoiceCategory(str, Enum):
    matched           = "matched"
    mismatched        = "mismatched"
    missing_in_gstr2b = "missing_in_gstr2b"   # in File 1 but missing in File 2
    missing_in_pr     = "missing_in_pr"        # in File 2 but missing in File 1


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
    gstr2bAmount:  Optional[float] = None
    difference:    Optional[float] = None
    category:      InvoiceCategory
    igst:          float = 0.0
    cgst:          float = 0.0
    sgst:          float = 0.0
    actionStatus:  Optional[str] = None       # Used by IMS ("Accepted", "Rejected", "Pending")
    taxableDiff:   Optional[float] = 0.0
    taxDiff:       Optional[float] = 0.0


class Supplier(BaseModel):
    name:             str
    gstin:            str
    invoiceCount:     int
    status:           SupplierStatus
    itcAtRisk:        float
    stateCode:        str   # 2-digit GSTIN state code
    stateName:        str   # Full state/UT name
    financialVariance: Optional[float] = 0.0


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


class ReconciliationSummary(BaseModel):
    matched:               int
    mismatched:            int
    missingInGstr2b:       int
    missingInPr:           int
    totalItcAtRisk:        float
    totalInvoices:         int
    complianceScore:       int   # 0-100
    financialDifference:   Optional[float] = 0.0
    financialMetricLabel:  Optional[str] = "Potential ITC at Risk"
    reconType:             Optional[str] = "gstr2b_pr"
    matchAccuracy:         Optional[float] = 0.0
    totalRecoveredOrValid: Optional[float] = 0.0


class ReconciliationResult(BaseModel):
    id:              str
    reconType:       Optional[str] = "gstr2b_pr"
    period:          str
    gstin:           str
    businessName:    str
    processedAt:     str
    summary:         ReconciliationSummary
    suppliers:       List[Supplier] = Field(default_factory=list)
    invoices:        List[InvoiceRow] = Field(default_factory=list)
    summarySections: Optional[List[SummarySectionRow]] = Field(default_factory=list)
    issueBreakdown:  Optional[Dict[str, int]] = Field(default_factory=dict)


class UploadResponse(BaseModel):
    jobId:     str
    reconType: Optional[str] = "gstr2b_pr"
    message:   str


class ErrorResponse(BaseModel):
    detail: str
