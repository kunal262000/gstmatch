// MODIFIED FILE — replaces: gstmatch/lib/api.ts
//
// Your exact authHeader() pattern, getResult()/downloadExcel()/downloadPDF()
// implementations are UNCHANGED below — same 401/403/404 error messages,
// same session-refresh fallback. ONLY startReconciliation() changes:
//   1. field names purchase_register/gstr2b → file1/file2 (matches the
//      updated backend route)
//   2. new optional reconType parameter, defaulting to 'gstr2b_pr' — the
//      canonical short-form id used everywhere else in the app
//
// getResult() return type is now a union — check `.engine` on the result
// to know whether you got a ReconciliationResult or a
// SummaryReconciliationResult.

import { ReconciliationResult, SummaryReconciliationResult, UploadResponse } from './types'
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Upload files and start reconciliation ────
export async function startReconciliation(
  file1: File,
  file2: File,
  period: string,
  gstin: string,
  businessName: string,
  userId?: string,
  reconType: string = 'gstr2b_pr'  // canonical short-form id
): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file1', file1)
  form.append('file2', file2)
  form.append('period', period)
  form.append('gstin', gstin)
  form.append('business_name', businessName)
  form.append('recon_type', reconType)   // NEW
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

// ─── Helpers ──────────────────────────────────── (UNCHANGED)
async function authHeader(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` }
  }
  const { data: { session: refreshed } } = await supabase.auth.refreshSession()
  return refreshed?.access_token ? { Authorization: `Bearer ${refreshed.access_token}` } : {}
}

// ─── Poll for result by job ID ──────────────── (UNCHANGED except return type)
export async function getResult(
  jobId: string
): Promise<ReconciliationResult | SummaryReconciliationResult> {
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

// ─── Download Excel report ──────────────────── (UNCHANGED)
export async function downloadExcel(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/results/${jobId}/excel`, {
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GST_Report_${jobId}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Download PDF report ─────────────────────── (UNCHANGED)
export async function downloadPDF(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/results/${jobId}/pdf`, {
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GST_Summary_${jobId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── NEW — fetch live reconciliation type list from backend ──
export async function getReconciliationTypes() {
  const res = await fetch(`${API_URL}/api/reconciliation-types`)
  if (!res.ok) throw new Error('Failed to fetch reconciliation types')
  return res.json()
}
