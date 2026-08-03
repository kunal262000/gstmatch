import { ReconciliationResult, UploadResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Upload files and start reconciliation ────
export async function startReconciliation(
  purchaseRegister: File,
  gstr2bFile: File,
  period: string,
  gstin: string,
  businessName: string,
  userId?: string
): Promise<UploadResponse> {
  const form = new FormData()
  form.append('purchase_register', purchaseRegister)
  form.append('gstr2b', gstr2bFile)
  form.append('period', period)
  form.append('gstin', gstin)
  form.append('business_name', businessName)
  if (userId) {
    form.append('user_id', userId)
  }

  const res = await fetch(`${API_URL}/api/reconcile`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Reconciliation failed')
  }

  return res.json()
}

// ─── Poll for result by job ID ────────────────
export async function getResult(jobId: string): Promise<ReconciliationResult> {
  const res = await fetch(`${API_URL}/api/results/${jobId}`)

  if (!res.ok) {
    if (res.status === 404) throw new Error('Result not found')
    throw new Error('Failed to fetch result')
  }

  return res.json()
}

// ─── Download Excel report ────────────────────
export async function downloadExcel(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/results/${jobId}/excel`)
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `GST_Report_${jobId}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Download PDF report ──────────────────────
export async function downloadPDF(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/results/${jobId}/pdf`)
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `GST_Summary_${jobId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
