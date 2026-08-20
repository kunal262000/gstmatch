import { NextResponse } from 'next/server'
import { getAuthUser, isUserAdmin, getAdminClient } from '@/lib/adminServer'
import { getReconciliationConfig } from '@/lib/reconciliation-registry'
import { getGstinStateName } from '@/lib/types'

const PAID_PLANS = ['starter', 'growth', 'pro', 'ca_pro', 'deluxe']
const MS_PER_DAY = 1000 * 60 * 60 * 24

// Monthly INR price used for the MRR estimate (matches lib/pricing.ts TIERS).
const MONTHLY_AMOUNT: Record<string, number> = {
  starter: 299,
  growth: 549,
  pro: 999,
  ca_pro: 2199,
  deluxe: 4999,
}

interface ReconData {
  reconType?: string
  summary?: {
    totalInvoices?: number
    matched?: number
    mismatched?: number
    missingInGstr2b?: number
    missingInPr?: number
    totalItcAtRisk?: number
    complianceScore?: number
  }
  suppliers?: Array<{ name?: string; gstin?: string; itcAtRisk?: number; invoiceCount?: number }>
}

interface ReconRow {
  id: string
  user_id: string | null
  period: string | null
  gstin: string | null
  created_at: string
  data: ReconData
}

interface UserRow {
  id: string
  email: string | null
  plan: string
  is_admin: boolean | null
  usage_count: number | null
  plan_expires_at: string | null
  created_at: string
}

const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!(await isUserAdmin({ id: user.id, email: user.email ?? null }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const [usersRes, reconsRes, activityRes] = await Promise.all([
    admin.from('users').select('id, email, plan, is_admin, usage_count, plan_expires_at, created_at'),
    admin.from('reconciliation_results').select('id, user_id, period, gstin, created_at, data').order('created_at', { ascending: false }).limit(1000),
    admin.from('user_activity').select('id, user_id, email, action, detail, created_at').order('created_at', { ascending: false }).limit(1000),
  ])

  const users: UserRow[] = usersRes.data || []
  const recons: ReconRow[] = reconsRes.data || []
  const activity = activityRes.data || []
  const now = Date.now()

  // ── Users / revenue ────────────────────────────────────────────
  const activePaidUsers = users.filter(
    (u) => PAID_PLANS.includes(u.plan) && (!u.plan_expires_at || new Date(u.plan_expires_at).getTime() > now)
  )
  const mrr = activePaidUsers.reduce((sum, u) => sum + (MONTHLY_AMOUNT[u.plan] || 0), 0)

  const planDistribution: Record<string, number> = {}
  for (const u of users) planDistribution[u.plan || 'free'] = (planDistribution[u.plan || 'free'] || 0) + 1

const expiringSoon = users
    .filter((u) => PAID_PLANS.includes(u.plan) && u.plan_expires_at)
    .map((u) => ({
      id: u.id,
      email: u.email,
      plan: u.plan,
      plan_expires_at: u.plan_expires_at as string,
      days: Math.ceil((new Date(u.plan_expires_at as string).getTime() - now) / MS_PER_DAY),
    }))
    .filter((u) => u.days >= 0 && u.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 30)

  const recentPayments = activity
    .filter((a: any) => a.action === 'payment')
    .slice(0, 50)
    .map((a: any) => ({
      email: a.email,
      plan: (a.detail && (a.detail.plan || a.detail.pack)) || null,
      amount: (a.detail && a.detail.amount) || null,
      mock: Boolean(a.detail && a.detail.mock),
      created_at: a.created_at,
    }))

  // ── Recon analytics ────────────────────────────────────────────
  let totalInvoices = 0
  let matched = 0
  let mismatched = 0
  let missingInGstr2b = 0
  let missingInPr = 0
  let totalItcAtRisk = 0
  let complianceSum = 0
  let complianceCount = 0

  const byType: Record<string, { name: string; count: number; totalItcAtRisk: number; totalInvoices: number }> = {}
  const byMonth: Record<string, { count: number; totalItcAtRisk: number }> = {}
  const byState: Record<string, { count: number; totalItcAtRisk: number }> = {}
  const supplierMap: Record<string, { name: string; gstin: string; count: number; totalItcAtRisk: number }> = {}

  for (const r of recons) {
    const s = r.data.summary || {}
    const itc = num(s.totalItcAtRisk)
    const inv = num(s.totalInvoices)

    totalInvoices += inv
    matched += num(s.matched)
    mismatched += num(s.mismatched)
    missingInGstr2b += num(s.missingInGstr2b)
    missingInPr += num(s.missingInPr)
    totalItcAtRisk += itc

    if (typeof s.complianceScore === 'number' && Number.isFinite(s.complianceScore)) {
      complianceSum += s.complianceScore
      complianceCount++
    }

    const cfg = getReconciliationConfig(r.data.reconType)
    const tKey = cfg.id
    if (!byType[tKey]) byType[tKey] = { name: cfg.shortTitle || cfg.name, count: 0, totalItcAtRisk: 0, totalInvoices: 0 }
    byType[tKey].count++
    byType[tKey].totalItcAtRisk += itc
    byType[tKey].totalInvoices += inv

    const month = (r.created_at || '').slice(0, 7)
    if (month) {
      if (!byMonth[month]) byMonth[month] = { count: 0, totalItcAtRisk: 0 }
      byMonth[month].count++
      byMonth[month].totalItcAtRisk += itc
    }

    if (r.gstin) {
      const state = getGstinStateName(r.gstin)
      if (!byState[state]) byState[state] = { count: 0, totalItcAtRisk: 0 }
      byState[state].count++
      byState[state].totalItcAtRisk += itc
    }

    for (const sup of r.data.suppliers || []) {
      const key = (sup.gstin || sup.name || 'unknown').toUpperCase()
      if (!supplierMap[key]) supplierMap[key] = { name: sup.name || sup.gstin || 'Unknown', gstin: sup.gstin || '', count: 0, totalItcAtRisk: 0 }
      supplierMap[key].count += num(sup.invoiceCount) || 0
      supplierMap[key].totalItcAtRisk += num(sup.itcAtRisk)
    }
  }

  const sortByItc = (obj: Record<string, any>) =>
    Object.values(obj).sort((a: any, b: any) => b.totalItcAtRisk - a.totalItcAtRisk)

  return NextResponse.json({
    recon: {
      totals: {
        totalInvoices,
        matched,
        mismatched,
        missingInGstr2b,
        missingInPr,
        totalItcAtRisk,
        avgCompliance: complianceCount ? Math.round(complianceSum / complianceCount) : 0,
      },
      byType: sortByItc(byType),
      byMonth: Object.entries(byMonth)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([month, v]) => ({ month, ...(v as any) })),
      byState: sortByItc(byState).slice(0, 15),
      topSuppliers: sortByItc(supplierMap).slice(0, 10),
    },
    revenue: {
      mrr,
      activePaidCount: activePaidUsers.length,
      planDistribution,
      expiringSoon,
      recentPayments,
    },
  })
}