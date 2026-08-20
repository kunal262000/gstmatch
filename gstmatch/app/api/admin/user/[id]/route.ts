import { NextResponse } from 'next/server'
import { getAuthUser, isUserAdmin, getAdminClient } from '@/lib/adminServer'

const isPaidPlan = (p: string) => ['starter', 'growth', 'pro', 'ca_pro', 'deluxe'].includes(p)

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const adminUser = await getAuthUser()
  if (!adminUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!(await isUserAdmin({ id: adminUser.id, email: adminUser.email ?? null }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const userId = params.id
  const [userRes, reconsRes, activityRes] = await Promise.all([
    admin.from('users').select('id, email, plan, is_admin, usage_count, plan_expires_at, created_at').eq('id', userId).maybeSingle(),
    admin.from('reconciliation_results').select('id, user_id, period, gstin, created_at, data').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
    admin.from('user_activity').select('id, user_id, email, action, detail, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
  ])

  const user: any = userRes.data || null
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const now = Date.now()
  const planActive = isPaidPlan(user.plan) && (!user.plan_expires_at || new Date(user.plan_expires_at).getTime() > now)

  const recons = (reconsRes.data || []).map((r: any) => ({
    id: r.id,
    period: r.period,
    gstin: r.gstin,
    created_at: r.created_at,
    reconType: r.data && r.data.reconType || null,
    summary: (r.data && r.data.summary) || {},
  }))

  const totals = recons.reduce(
    (acc: any, r: any) => {
      acc.totalInvoices += typeof r.summary.totalInvoices === 'number' ? r.summary.totalInvoices : 0
      acc.totalItcAtRisk += typeof r.summary.totalItcAtRisk === 'number' ? r.summary.totalItcAtRisk : 0
      if (typeof r.summary.complianceScore === 'number') {
        acc.complianceSum += r.summary.complianceScore
        acc.complianceCount++
      }
      return acc
    },
    { totalInvoices: 0, totalItcAtRisk: 0, complianceSum: 0, complianceCount: 0 }
  )

  return NextResponse.json({
    user: { ...user, planActive },
    recons,
    activity: activityRes.data || [],
    totals: {
      totalRecons: recons.length,
      totalInvoices: totals.totalInvoices,
      totalItcAtRisk: totals.totalItcAtRisk,
      avgCompliance: totals.complianceCount ? Math.round(totals.complianceSum / totals.complianceCount) : 0,
    },
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const adminUser = await getAuthUser()
  if (!adminUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!(await isUserAdmin({ id: adminUser.id, email: adminUser.email ?? null }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const userId = params.id
  if (body.action === 'reset_usage') {
    const { error } = await (admin.from('users') as any).update({ usage_count: 0 }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await admin.from('user_activity').insert({
      user_id: adminUser.id,
      email: adminUser.email,
      action: 'admin_plan_change',
      detail: { target_user: userId, note: 'usage_count reset' },
    } as any)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}