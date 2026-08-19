import { ReconciliationResult, UploadResponse, Supplier } from './types'
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Import state extraction functions
import { extractGstinStateCode, getGstinStateName } from './types'

// ─── Upload files and start reconciliation ────
export async function startReconciliation(
  file1: File,
  file2: File,
  period: string,
  gstin: string,
  businessName: string,
  reconType: string = 'gstr2b_pr',
  userId?: string
): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file1', file1)
  form.append('file2', file2)
  // Backward compatibility
  form.append('purchase_register', file1)
  form.append('gstr2b', file2)

  form.append('recon_type', reconType)
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
    const err = await res.json().catch(() => ({ detail: 'Reconciliation request failed' }))
    throw new Error(err.detail || 'Reconciliation failed')
  }

  return res.json()
}

// ─── Helpers ────────────────────────────────────
async function authHeader(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` }
  }
  const { data: { session: refreshed } } = await supabase.auth.refreshSession()
  return refreshed?.access_token ? { Authorization: `Bearer ${refreshed.access_token}` } : {}
}

// ─── Poll for result by job ID ────────────────
export async function getResult(jobId: string): Promise<ReconciliationResult> {
  const res = await fetch(`${API_URL}/api/results/${jobId}`, {
    headers: await authHeader(),
    cache: 'no-store',
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error(`Please log in to view this result (job ${jobId})`)
    if (res.status === 403) throw new Error('You do not have access to this result')
    if (res.status === 404) throw new Error(`Result not found for job ${jobId}`)
    throw new Error(`Failed to fetch result (HTTP ${res.status}, job ${jobId})`)
  }

  return res.json()
}

// ─── Download Excel report ────────────────────
export async function downloadExcel(jobId: string, customFilename?: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/results/${jobId}/excel`, {
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = customFilename || `GST_Report_${jobId}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Download PDF report ──────────────────────
export async function downloadPDF(jobId: string, customFilename?: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/results/${jobId}/pdf`, {
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = customFilename || `GST_Summary_${jobId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
