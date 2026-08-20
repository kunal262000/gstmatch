import { NextResponse } from 'next/server'
import { getAuthUser, isUserAdmin, getAdminClient } from '@/lib/adminServer'

interface AdminUser {
  id: string
  email: string | null
  plan: string
  is_admin: boolean | null
  usage_count: number | null
  plan_expires_at: string | null
  created_at: string
}

interface ActivityRow {
  id: number
  user_id: string | null
  email: string | null
  action: string
  detail: Record<string, any> | null
  created_at: string
}

interface ReconRow {
  id: string
  user_id: string | null
  period: string | null
  gstin: string | null
  created_at: string
  data: {
    reconType?: string
    summary?: {
      matched?: number
      mismatched?: number
      missingInGstr2b?: number
      missingInPr?: number
      totalItcAtRisk?: number
      totalInvoices?: number
      complianceScore?: number
    }
  }
}

const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!(await isUserAdmin({ id: user.id, email: user.email ?? null }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const [usersRes, activityRes, reconsRes, reconCount] = await Promise.all([
    admin
      .from('users')
      .select('id, email, plan, is_admin, usage_count, plan_expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('user_activity')
      .select('id, user_id, email, action, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(300),
    admin
      .from('reconciliation_results')
      .select('id, user_id, period, gstin, created_at, data')
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('reconciliation_results').select('id', { count: 'exact', head: true }),
  ])

  const users: AdminUser[] = usersRes.data || []
  const activity: ActivityRow[] = activityRes.data || []
  const recons: ReconRow[] = reconsRes.data || []
  const emailByUser = new Map<string, string>()
  for (const u of users) if (u.email) emailByUser.set(u.id, u.email)

  const now = Date.now()
  const isPaidPlan = (p: string) => ['starter', 'growth', 'pro', 'ca_pro', 'deluxe'].includes(p)
  const paidUsers = users.filter(
    (u) => isPaidPlan(u.plan) && (!u.plan_expires_at || new Date(u.plan_expires_at).getTime() > now)
  )

  // Light aggregate over recent recons (for KPI cards + table).
  let totalInvoices = 0
  let totalItcAtRisk = 0
  let complianceSum = 0
  let complianceCount = 0
  for (const r of recons) {
    const s = r.data.summary || {}
    totalInvoices += num(s.totalInvoices)
    totalItcAtRisk += num(s.totalItcAtRisk)
    if (typeof s.complianceScore === 'number' && Number.isFinite(s.complianceScore)) {
      complianceSum += s.complianceScore
      complianceCount++
    }
  }

  const reconRows = recons.map((r) => ({
    id: r.id,
    userId: r.user_id,
    email: (r.user_id && emailByUser.get(r.user_id)) || null,
    period: r.period,
    gstin: r.gstin,
    reconType: r.data.reconType || null,
    createdAt: r.created_at,
    summary: r.data.summary || {},
  }))

  return NextResponse.json({
    stats: {
      totalUsers: users.length,
      activePaidUsers: paidUsers.length,
      totalReconciliations: reconCount.count ?? users.reduce((s, u) => s + (u.usage_count || 0), 0),
      totalInvoices,
      totalItcAtRisk,
      avgCompliance: complianceCount ? Math.round(complianceSum / complianceCount) : 0,
      activityCount: activity.length,
    },
    users,
    activity,
    recons: reconRows,
  })
}