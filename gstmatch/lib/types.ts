// ─── India State Codes (GSTIN first 2 digits) ────────────────
// All 36 Indian States and Union Territories GSTIN prefixes
export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '21': 'Sikkim',
  '22': 'Arunachal Pradesh',
  '23': 'Nagaland',
  '24': 'Manipur',
  '25': 'Mizoram',
  '26': 'Tripura',
  '27': 'Meghalaya',
  '28': 'Assam',
  '11': 'West Bengal',
  '12': 'Jharkhand',
  '13': 'Odisha',
  '14': 'Chhattisgarh',
  '15': 'Madhya Pradesh',
  '16': 'Gujarat',
  '17': 'Daman & Diu',
  '18': 'Dadra & Nagar Haveli',
  '19': 'Maharashtra',
  '20': ' Karnataka',
  '29': 'Kerala',
  '30': 'Tamil Nadu',
  '31': 'Puducherry',
  '32': 'Andhra Pradesh',
  '33': 'Telangana',
  '34': 'Lakshadweep',
  '35': 'Andaman & Nicobar',
  '36': 'Sikkim', // duplicate, keep for completeness
  '37': ' Goa',
}

export function extractGstinStateCode(gstin: string): string | null {
  if (!gstin || gstin.length !== 15) return null
  const stateCode = gstin.substring(0, 2)
  return INDIAN_STATES[stateCode] || stateCode
}

export function getGstinStateName(gstin: string): string {
  const stateCode = extractGstinStateCode(gstin)
  return stateCode ? INDIAN_STATES[stateCode] || stateCode : 'Unknown'
}

// ─── Supplier ────────────────────────────────
export type SupplierStatus = 'filed' | 'not_filed' | 'mismatch'

export interface Supplier {
  name: string
  gstin: string
  invoiceCount: number
  status: SupplierStatus
  itcAtRisk: number   // in rupees
  stateCode: string   // 2-digit GSTIN state code
  stateName: string   // Full state/UT name
}

// ─── Single invoice row ───────────────────────
export type InvoiceCategory =
  | 'matched'
  | 'mismatched'
  | 'missing_in_gstr2b'
  | 'missing_in_pr'

export interface InvoiceRow {
  supplierName: string
  gstin: string
  invoiceNo: string
  invoiceDate: string
  yourAmount: number
  gstr2bAmount: number | null
  difference: number | null
  category: InvoiceCategory
  igst: number
  cgst: number
  sgst: number
}

// ─── Reconciliation result ────────────────────
export interface ReconciliationSummary {
  matched: number
  mismatched: number
  missingInGstr2b: number
  missingInPr: number
  totalItcAtRisk: number   // rupees
  totalInvoices: number
  complianceScore: number   // 0–100
}

export interface ReconciliationResult {
  id: string
  period: string        // e.g. "June 2025"
  gstin: string
  businessName: string
  processedAt: string        // ISO date string
  summary: ReconciliationSummary
  suppliers: Supplier[]
  invoices: InvoiceRow[]
}

// ─── Upload form state ────────────────────────
export interface UploadFormState {
  purchaseRegister: File | null
  gstr2bFile: File | null
  period: string
  gstin: string
  businessName: string
}

// ─── API responses ────────────────────────────
export interface UploadResponse {
  jobId: string
  message: string
}

export interface ApiError {
  detail: string
}
