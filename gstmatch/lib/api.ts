import { ReconciliationResult, UploadResponse } from './types'
import { supabase } from './supabase'

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

// ─── Helpers ────────────────────────────────────
// Attach the current user's Supabase access token so backend routes gated by
// JWT ownership checks (e.g. current_user_or_401) can authorize the request.
// If the token isn't in the SSR cookie yet (client-side nav race), refresh it so
// protected fetch calls don't 401 on the deployed site.
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
export async function downloadExcel(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/results/${jobId}/excel`, {
    headers: await authHeader(),
  })
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
  const res = await fetch(`${API_URL}/api/results/${jobId}/pdf`, {
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `GST_Summary_${jobId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
