// ─── Supplier ────────────────────────────────
export type SupplierStatus = 'filed' | 'not_filed' | 'mismatch'

export interface Supplier {
  name:         string
  gstin:        string
  invoiceCount: number
  status:       SupplierStatus
  itcAtRisk:    number   // in rupees
}

// ─── Single invoice row ───────────────────────
export type InvoiceCategory =
  | 'matched'
  | 'mismatched'
  | 'missing_in_gstr2b'
  | 'missing_in_pr'

export interface InvoiceRow {
  supplierName:  string
  gstin:         string
  invoiceNo:     string
  invoiceDate:   string
  yourAmount:    number
  gstr2bAmount:  number | null
  difference:    number | null
  category:      InvoiceCategory
  igst:          number
  cgst:          number
  sgst:          number
}

// ─── Reconciliation result ────────────────────
export interface ReconciliationSummary {
  matched:           number
  mismatched:        number
  missingInGstr2b:   number
  missingInPr:       number
  totalItcAtRisk:    number   // rupees
  totalInvoices:     number
  complianceScore:   number   // 0–100
}

export interface ReconciliationResult {
  id:           string
  period:       string        // e.g. "June 2025"
  gstin:        string
  businessName: string
  processedAt:  string        // ISO date string
  summary:      ReconciliationSummary
  suppliers:    Supplier[]
  invoices:     InvoiceRow[]
}

// ─── Upload form state ────────────────────────
export interface UploadFormState {
  purchaseRegister: File | null
  gstr2bFile:       File | null
  period:           string
  gstin:            string
  businessName:     string
}

// ─── API responses ────────────────────────────
export interface UploadResponse {
  jobId:   string
  message: string
}

export interface ApiError {
  detail: string
}
