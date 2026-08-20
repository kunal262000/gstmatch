import { NextResponse } from 'next/server'
import { getAuthUser, isUserAdmin, getAdminClient } from '@/lib/adminServer'
import { getReconciliationConfig } from '@/lib/reconciliation-registry'

const csvCell = (v: any) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const toCSV = (header: string[], rows: any[][]) => {
  const lines = [header.map(csvCell).join(',')]
  for (const r of rows) lines.push(r.map(csvCell).join(','))
  return '\uFEFF' + lines.join('\r\n')
}

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!(await isUserAdmin({ id: user.id, email: user.email ?? null }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const type = new URL(req.url).searchParams.get('type') || 'users'

  if (type === 'recons') {
    const [reconsRes, usersRes] = await Promise.all([
      admin.from('reconciliation_results').select('id, user_id, period, gstin, created_at, data').order('created_at', { ascending: false }).limit(2000),
      admin.from('users').select('id, email'),
    ])
    const em = new Map((usersRes.data || []).map((u: any) => [u.id, u.email]))
    const rows = (reconsRes.data || []).map((r: any) => {
      const s = r.data && r.data.summary || {}
      const cfg = getReconciliationConfig(r.data && r.data.reconType)
      return [
        r.created_at, em.get(r.user_id) || '', (r.period || ''), (r.gstin || ''), cfg.shortTitle || cfg.name,
        s.totalInvoices || 0, s.matched || 0, s.mismatched || 0, s.missingInGstr2b || 0, s.missingInPr || 0,
        s.totalItcAtRisk || 0, s.complianceScore ?? '', r.id,
      ]
    })
    const csv = toCSV(
      ['Created At', 'Email', 'Period', 'GSTIN', 'Type', 'Invoices', 'Matched', 'Mismatch', 'Missing in File2', 'Missing in File1', 'ITC at Risk', 'Compliance', 'Job Id'],
      rows
    )
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reconciliations.csv"' } })
  }

  if (type === 'activity') {
    const res = await admin.from('user_activity').select('id, user_id, email, action, detail, created_at').order('created_at', { ascending: false }).limit(2000)
    const rows = (res.data || []).map((a: any) => [a.created_at, a.email || '', a.action, a.detail ? JSON.stringify(a.detail) : '', a.user_id || ''])
    const csv = toCSV(['When', 'Email', 'Action', 'Detail', 'User Id'], rows)
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="activity.csv"' } })
  }

  // Default: users
  const res = await admin.from('users').select('id, email, plan, is_admin, usage_count, plan_expires_at, created_at').order('created_at', { ascending: false })
  const rows = (res.data || []).map((u: any) => [u.created_at, u.email || '', u.plan || '', u.usage_count || 0, u.plan_expires_at || '', u.is_admin ? 'yes' : 'no', u.id])
  const csv = toCSV(['Joined', 'Email', 'Plan', 'Recons', 'Plan Expires', 'Admin', 'User Id'], rows)
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="users.csv"' } })
}