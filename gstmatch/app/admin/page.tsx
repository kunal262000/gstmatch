'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import KpiCard from '@/components/admin/KpiCard'
import BarList from '@/components/admin/BarList'
import MiniBars from '@/components/admin/MiniBars'
import ExpiryBadge from '@/components/admin/ExpiryBadge'

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
  userId: string | null
  email: string | null
  period: string | null
  gstin: string | null
  reconType: string | null
  createdAt: string
  summary: {
    matched?: number
    mismatched?: number
    missingInGstr2b?: number
    missingInPr?: number
    totalItcAtRisk?: number
    totalInvoices?: number
    complianceScore?: number
  }
}

interface Overview {
  stats: {
    totalUsers: number
    activePaidUsers: number
    totalReconciliations: number
    totalInvoices: number
    totalItcAtRisk: number
    avgCompliance: number
    activityCount: number
  }
  users: AdminUser[]
  activity: ActivityRow[]
  recons: ReconRow[]
}

interface Analytics {
  recon: {
    totals: {
      totalInvoices: number
      matched: number
      mismatched: number
      missingInGstr2b: number
      missingInPr: number
      totalItcAtRisk: number
      avgCompliance: number
    }
    byType: Array<{ name: string; count: number; totalItcAtRisk: number; totalInvoices: number }>
    byMonth: Array<{ month: string; count: number; totalItcAtRisk: number }>
    byState: Array<{ state: string; count: number; totalItcAtRisk: number }>
    topSuppliers: Array<{ name: string; gstin: string; count: number; totalItcAtRisk: number }>
  }
  revenue: {
    mrr: number
    activePaidCount: number
    planDistribution: Record<string, number>
    expiringSoon: Array<{ id: string; email: string | null; plan: string; plan_expires_at: string; days: number }>
    recentPayments: Array<{ email: string | null; plan: string | null; amount: number | null; mock: boolean; created_at: string }>
  }
}

interface UserRecon {
  id: string
  period: string | null
  gstin: string | null
  created_at: string
  reconType: string | null
  summary: {
    matched?: number
    mismatched?: number
    missingInGstr2b?: number
    missingInPr?: number
    totalItcAtRisk?: number
    totalInvoices?: number
    complianceScore?: number
  }
}

interface UserDetail {
  user: AdminUser & { planActive: boolean }
  recons: UserRecon[]
  activity: ActivityRow[]
  totals: { totalRecons: number; totalInvoices: number; totalItcAtRisk: number; avgCompliance: number }
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Professional',
  ca_pro: 'CA / Business Pro',
  deluxe: 'Deluxe',
}

const ACTIVITY_LABELS: Record<string, string> = {
  signup: 'Signed up',
  login: 'Logged in',
  upload: 'Reconciliation',
  payment: 'Payment',
  admin_plan_change: 'Admin: plan change',
}

type Section = 'overview' | 'users' | 'recons' | 'revenue' | 'activity'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'recons', label: 'Reconciliations', icon: '🧾' },
  { id: 'revenue', label: 'Revenue & Plans', icon: '💳' },
  { id: 'activity', label: 'Activity Log', icon: '📈' },
]

const fmtINR = (v: number) => (v ? `₹${Math.round(v).toLocaleString('en-IN')}` : '₹0')

const fmtNum = (v: number) => (v ? v.toLocaleString('en-IN') : '0')

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(m) - 1] || m} ${y}`
}

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')
  const [section, setSection] = useState<Section>('overview')

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const [userSearch, setUserSearch] = useState('')
  const [reconSearch, setReconSearch] = useState('')
  const [reconTypeFilter, setReconTypeFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')

  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadOverview()
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadOverview = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) { setForbidden(true); setLoading(false); return }
      if (!res.ok) throw new Error('Failed to load admin data')
      setData(await res.json())
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' })
      if (res.ok) setAnalytics(await res.json())
    } catch (e: any) {
      // Non-fatal — analytics panel degrades gracefully.
      console.warn('analytics load failed', e)
    }
  }

const savePlan = async (userId: string) => {
    const plan = drafts[userId]
    if (!plan) return
    setSaving(userId)
    setError('')
    try {
      const durationDays = plan === 'free' ? 0 : 30
      const res = await fetch('/api/admin/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan, durationDays }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update plan')
      await loadOverview()
      await loadAnalytics()
    } catch (e: any) {
      setError(e.message || 'Failed to update plan')
    } finally {
      setSaving(null)
    }
  }

  const openUser = async (userId: string) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/admin/user/${userId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load user')
      setDetail(await res.json())
    } catch (e: any) {
      setError(e.message || 'Failed to load user')
    } finally {
      setDetailLoading(false)
    }
  }

  const resetUsage = async (userId: string) => {
    if (!confirm("Reset this user's usage count to 0?")) return
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_usage' }),
      })
      if (!res.ok) throw new Error('Failed to reset usage')
      await loadOverview()
      if (detail && detail.user.id === userId) await openUser(userId)
    } catch (e: any) {
      setError(e.message || 'Failed to reset usage')
    }
  }

  const exportCSV = (type: string) => {
    window.open(`/api/admin/export?type=${type}`, '_blank')
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    const list = data?.users || []
    if (!q) return list
    return list.filter((u) => (u.email || '').toLowerCase().includes(q) || u.plan.includes(q))
  }, [data, userSearch])

  const filteredRecons = useMemo(() => {
    const q = reconSearch.trim().toLowerCase()
    let list = data?.recons || []
    if (reconTypeFilter !== 'all') list = list.filter((r) => r.reconType === reconTypeFilter)
    if (q) {
      list = list.filter(
        (r) =>
          (r.period || '').toLowerCase().includes(q) ||
          (r.gstin || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [data, reconSearch, reconTypeFilter])

  const filteredActivity = useMemo(() => {
    let list = data?.activity || []
    if (activityFilter !== 'all') list = list.filter((a) => a.action === activityFilter)
    return list
  }, [data, activityFilter])

  const reconTypeOptions = useMemo(() => {
    const set = new Set<string>()
    ;(data?.recons || []).forEach((r) => r.reconType && set.add(r.reconType))
    return Array.from(set)
  }, [data])

  const actionLabel = (action: string) => ACTIVITY_LABELS[action] || action

  const sideItem = (s: Section) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
    fontSize: 13, fontWeight: section === s ? 700 : 500, textDecoration: 'none',
    color: section === s ? 'var(--primary)' : 'var(--text-2)',
    background: section === s ? 'var(--primary-bg)' : 'transparent',
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavBar />
        <main className="page-container" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Loading dashboard…
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
        {/* ── Left sidebar ─────────────────────────────── */}
        <aside
          className="neu-raised"
          style={{
            width: 220, flexShrink: 0, background: 'var(--neu-bg)',
            padding: '18px 14px', position: 'sticky', top: 0, minHeight: 'calc(100vh - 74px)',
            display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-start',
          }}
        >
          <div style={{ padding: '0 12px', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>Admin</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Workspace control</div>
          </div>
          {SECTIONS.map((s) => (
            <div key={s.id} onClick={() => setSection(s.id)} style={sideItem(s.id)}>
              <span style={{ fontSize: 15 }}>{s.icon}</span>
              <span>{s.label}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <Link href="/" style={sideItem('overview')}>
            <span style={{ fontSize: 15 }}>↩</span>
            <span>Back to site</span>
          </Link>
        </aside>

<main className="page-container" style={{ flex: 1, minWidth: 0, padding: '28px 24px', maxWidth: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)' }}>Admin Dashboard</h1>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 5 }}>
                Users, reconciliations, revenue and activity across your workspace.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="neu-btn" onClick={() => { loadOverview(); loadAnalytics(); }} style={{ cursor: 'pointer', padding: '10px 16px', fontSize: 13 }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, marginBottom: 20, fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {forbidden && (
            <NeuCard padding="40px" style={{ textAlign: 'center', maxWidth: 460, margin: '40px auto' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h2 style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>Access restricted</h2>
              <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 24 }}>
                This dashboard is only available to workspace administrators.
              </p>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <span className="neu-btn neu-btn-primary" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 14, fontWeight: 600 }}>← Back to Home</span>
              </Link>
            </NeuCard>
          )}

          {data && !forbidden && (
            <>
              {/* ── KPI row ──────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 16, marginBottom: 26 }}>
                <KpiCard icon="👥" value={data.stats.totalUsers} label="Users" onClick={() => setSection('users')} />
                <KpiCard icon="💳" value={data.stats.activePaidUsers} label="Active Paid" color="success" onClick={() => setSection('revenue')} />
                <KpiCard icon="💰" value={fmtINR(analytics?.revenue.mrr || 0)} label="Est. MRR" color="info" sub="/month" onClick={() => setSection('revenue')} />
                <KpiCard icon="🧾" value={fmtNum(data.stats.totalReconciliations)} label="Reconciliations" color="warning" onClick={() => setSection('recons')} />
                <KpiCard icon="📄" value={fmtNum(data.stats.totalInvoices)} label="Invoices" onClick={() => setSection('recons')} />
                <KpiCard icon="⚠️" value={fmtINR(data.stats.totalItcAtRisk)} label="ITC at Risk" color="danger" onClick={() => setSection('recons')} />
                <KpiCard icon="🎯" value={`${data.stats.avgCompliance}%`} label="Avg Compliance" color="success" />
              </div>

{/* ── OVERVIEW ─────────────────────────────── */}
              {section === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20 }}>
                  <NeuCard padding="22px">
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Reconciliations by month</h3>
                    {analytics && analytics.recon.byMonth.length ? (
                      <MiniBars data={analytics.recon.byMonth.slice(-8).map((m) => ({ label: monthLabel(m.month), value: m.count }))} formatValue={(v) => fmtNum(v)} />
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet.</p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>Reconciliation runs per month</p>
                  </NeuCard>

                  <NeuCard padding="22px">
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>By reconciliation type</h3>
                    {analytics && analytics.recon.byType.length ? (
                      <BarList items={analytics.recon.byType.map((t) => ({ label: t.name, value: t.count }))} />
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet.</p>
                    )}
                  </NeuCard>

                  <NeuCard padding="22px">
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Plan mix</h3>
                    {analytics && Object.keys(analytics.revenue.planDistribution).length ? (
                      <BarList
                        items={Object.entries(analytics.revenue.planDistribution).map(([plan, count]) => ({ label: PLAN_NAMES[plan] || plan, value: count, color: plan === 'free' ? 'var(--text-3)' : 'var(--primary)' }))}
                      />
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet.</p>
                    )}
                  </NeuCard>

                  <NeuCard padding="22px">
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Top suppliers by ITC at risk</h3>
                    {analytics && analytics.recon.topSuppliers.length ? (
                      <BarList items={analytics.recon.topSuppliers.map((s) => ({ label: s.name, value: s.totalItcAtRisk, color: 'var(--warning)' }))} formatValue={(v) => fmtINR(v)} />
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet.</p>
                    )}
                  </NeuCard>
                </div>
              )}

{/* ── USERS ─────────────────────────────────── */}
              {section === 'users' && (
                <NeuCard padding="24px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Users</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Click a user to see their data. Change a plan and hit “Apply”.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        className="neu-input"
                        placeholder="Search email or plan…"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: 13, width: 220 }}
                      />
                      <button className="neu-btn" onClick={() => exportCSV('users')} style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 12 }}>
                        ⬇ CSV
                      </button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['User', 'Plan', 'Status', 'Recons', 'ITC at Risk', 'Joined', ''].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={7} style={{ padding: '18px 12px', color: 'var(--text-3)', textAlign: 'center' }}>No users found.</td></tr>
                        )}
                        {filteredUsers.map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--text-1)', fontWeight: 600 }}>
                              <span style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }} onClick={() => openUser(u.id)}>
                                {u.email || '—'}{u.is_admin ? ' 🛡️' : ''}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <select
                                className="neu-input"
                                style={{ padding: '6px 8px', fontSize: 12, width: 140 }}
                                value={drafts[u.id] ?? u.plan}
                                onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                              >
                                {Object.entries(PLAN_NAMES).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                              {drafts[u.id] !== undefined && drafts[u.id] !== u.plan && (
                                <button
                                  className="neu-btn neu-btn-primary"
                                  disabled={saving === u.id}
                                  onClick={() => savePlan(u.id)}
                                  style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 8 }}
                                >
                                  {saving === u.id ? '…' : 'Apply'}
                                </button>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <ExpiryBadge expiresAt={u.plan_expires_at} paidPlan={(u.plan && u.plan !== 'free') || false} />
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-2)' }}>
                              {u.usage_count ?? 0}
                              <button onClick={() => resetUsage(u.id)} title="Reset usage" style={{ marginLeft: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--danger)' }}>↺</button>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--danger)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {u.plan_expires_at && u.plan !== 'free' ? fmtINR((data?.recons || []).filter((r) => r.userId === u.id).reduce((s, r) => s + (r.summary.totalItcAtRisk || 0), 0)) : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-3)' }}>{fmtDate(u.created_at)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button className="neu-btn" onClick={() => openUser(u.id)} style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </NeuCard>
              )}

{/* ── RECONCILIATIONS ───────────────────────── */}
              {section === 'recons' && (
                <NeuCard padding="24px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Reconciliations</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Every reconciliation run with its outcome and the ITC it flagged.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input className="neu-input" placeholder="Search period, GSTIN or email…" value={reconSearch} onChange={(e) => setReconSearch(e.target.value)} style={{ padding: '8px 12px', fontSize: 13, width: 220 }} />
                      <select className="neu-input" value={reconTypeFilter} onChange={(e) => setReconTypeFilter(e.target.value)} style={{ padding: '8px 10px', fontSize: 13 }}>
                        <option value="all">All types</option>
                        {reconTypeOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                      <button className="neu-btn" onClick={() => exportCSV('recons')} style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 12 }}>⬇ CSV</button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['When', 'User', 'Period', 'GSTIN', 'Invoices', 'Matched', 'Issues', 'ITC at Risk', 'Compliance'].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '11px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecons.length === 0 && (
                          <tr><td colSpan={9} style={{ padding: '18px 12px', color: 'var(--text-3)', textAlign: 'center' }}>No reconciliations found.</td></tr>
                        )}
                        {filteredRecons.map((r) => {
                          const issues = (r.summary.mismatched || 0) + (r.summary.missingInGstr2b || 0) + (r.summary.missingInPr || 0)
                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                              <td style={{ padding: '10px 12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-1)', fontWeight: 600 }}>{r.email || '—'}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{r.period || '—'}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 12 }}>{r.gstin || '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-1)', fontWeight: 700 }}>{r.summary.totalInvoices ?? 0}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--primary-dark)' }}>{r.summary.matched ?? 0}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: issues > 0 ? 'var(--warning-bg)' : 'var(--primary-bg)', color: issues > 0 ? 'var(--warning)' : 'var(--primary-dark)' }}>{issues}</span>
                              </td>
                              <td style={{ padding: '10px 12px', color: (r.summary.totalItcAtRisk || 0) > 0 ? 'var(--danger)' : 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtINR(r.summary.totalItcAtRisk || 0)}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{r.summary.complianceScore != null ? `${r.summary.complianceScore}%` : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </NeuCard>
              )}

{/* ── REVENUE / PLANS ───────────────────────── */}
              {section === 'revenue' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginBottom: 20 }}>
                    <KpiCard icon="💰" value={fmtINR(analytics?.revenue.mrr || 0)} label="Estimated MRR" color="success" sub="from active paid plans" />
                    <KpiCard icon="💳" value={analytics?.revenue.activePaidCount || 0} label="Active Paid Users" color="info" />
                    <KpiCard icon="⏳" value={analytics?.revenue.expiringSoon.length || 0} label="Expiring in 30 days" color="warning" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20 }}>
                    <NeuCard padding="22px">
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Plan distribution</h3>
                      {analytics && Object.keys(analytics.revenue.planDistribution).length ? (
                        <BarList
                          items={Object.entries(analytics.revenue.planDistribution).map(([plan, count]) => ({ label: PLAN_NAMES[plan] || plan, value: count, color: plan === 'free' ? 'var(--text-3)' : 'var(--primary)' }))} />
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No data yet.</p>
                      )}
                    </NeuCard>

                    <NeuCard padding="22px">
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Plans expiring soon (30 days)</h3>
                      {analytics && analytics.revenue.expiringSoon.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {analytics.revenue.expiringSoon.map((e) => (
                            <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--neu-bg)', boxShadow: 'inset 2px 2px 4px var(--neu-dark), inset -2px -2px 4px var(--neu-light)' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 600 }}>{e.email || '—'}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{PLAN_NAMES[e.plan] || e.plan}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: e.days <= 7 ? 'var(--danger)' : 'var(--warning)' }}>{e.days}d</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No plans expiring soon.</p>
                      )}
                    </NeuCard>

                    <NeuCard padding="22px" style={{ gridColumn: '1 / -1' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Recent payments</h3>
                      {analytics && analytics.revenue.recentPayments.length ? (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                {['When', 'Email', 'Plan', 'Amount'].map((h) => (
                                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.revenue.recentPayments.map((p, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                                  <td style={{ padding: '10px 12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                                  <td style={{ padding: '10px 12px', color: 'var(--text-1)', fontWeight: 600 }}>{p.email || '—'}{p.mock ? ' (mock)' : ''}</td>
                                  <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{PLAN_NAMES[(p.plan as string) || ''] || p.plan || '—'}</td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--primary-dark)' }}>{p.amount != null ? fmtINR(p.amount) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No payments recorded yet.</p>
                      )}
                    </NeuCard>
                  </div>
                </>
              )}

{/* ── ACTIVITY ───────────────────────────────── */}
              {section === 'activity' && (
                <NeuCard padding="24px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Activity log</h3>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Signups, reconciliations, payments and admin actions.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select className="neu-input" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={{ padding: '8px 10px', fontSize: 13 }}>
                        <option value="all">All actions</option>
                        {Object.keys(ACTIVITY_LABELS).map((a) => (<option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>))}
                      </select>
                      <button className="neu-btn" onClick={() => exportCSV('activity')} style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 12 }}>⬇ CSV</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {Object.entries(ACTIVITY_LABELS).map(([key, label]) => {
                      const count = (data?.activity || []).filter((a) => a.action === key).length
                      return (
                        <span key={key} style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600, background: 'var(--neu-bg)', color: 'var(--text-2)', boxShadow: 'inset 1px 1px 3px var(--neu-dark), inset -1px -1px 3px var(--neu-light)' }}>
                          {label}: <b style={{ color: 'var(--text-1)' }}>{count}</b>
                        </span>
                      )
                    })}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['When', 'User', 'Action', 'Details'].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivity.length === 0 && (
                          <tr><td colSpan={4} style={{ padding: '18px 16px', color: 'var(--text-3)', textAlign: 'center' }}>No activity recorded yet.</td></tr>
                        )}
                        {filteredActivity.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontWeight: 600 }}>{a.email || '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600, background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                                {actionLabel(a.action)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: 12 }}>{a.detail ? JSON.stringify(a.detail) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </NeuCard>
              )}
            </>
          )}

</main>
      </div>

      {/* ── User detail modal ─────────────────────────── */}
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '36px 16px', overflowY: 'auto' }}
          onClick={() => setDetail(null)}
        >
          <div style={{ maxWidth: 980, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <NeuCard padding="24px">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                    {detail.user.email || 'Unknown user'}{detail.user.is_admin ? ' 🛡️' : ''}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    <ExpiryBadge expiresAt={detail.user.plan_expires_at} paidPlan={detail.user.plan !== 'free'} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{PLAN_NAMES[detail.user.plan] || detail.user.plan}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Joined {fmtDate(detail.user.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => resetUsage(detail.user.id)} className="neu-btn" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 12, color: 'var(--danger)' }}>↺ Reset usage ({detail.user.usage_count ?? 0})</button>
                  <button onClick={() => setDetail(null)} className="neu-btn" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: 12 }}>✕ Close</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
                <KpiCard icon="🧾" value={fmtNum(detail.totals.totalRecons)} label="Reconciliations" />
                <KpiCard icon="📄" value={fmtNum(detail.totals.totalInvoices)} label="Invoices" />
                <KpiCard icon="⚠️" value={fmtINR(detail.totals.totalItcAtRisk)} label="ITC at Risk" color="danger" />
                <KpiCard icon="🎯" value={`${detail.totals.avgCompliance}%`} label="Avg Compliance" color="success" />
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>Their reconciliations</h4>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {['When', 'Period', 'GSTIN', 'Invoices', 'Matched', 'Issues', 'ITC at Risk', 'Compliance'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recons.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: '14px 10px', color: 'var(--text-3)', textAlign: 'center' }}>No reconciliations yet.</td></tr>
                    )}
                    {detail.recons.map((r) => {
                      const issues = (r.summary.mismatched || 0) + (r.summary.missingInGstr2b || 0) + (r.summary.missingInPr || 0)
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                          <td style={{ padding: '9px 10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                          <td style={{ padding: '9px 10px', color: 'var(--text-2)' }}>{r.period || '—'}</td>
                          <td style={{ padding: '9px 10px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 12 }}>{r.gstin || '—'}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--text-1)', fontWeight: 700 }}>{r.summary.totalInvoices ?? 0}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--primary-dark)' }}>{r.summary.matched ?? 0}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 'var(--r-pill)', fontSize: 10, fontWeight: 700, background: issues > 0 ? 'var(--warning-bg)' : 'var(--primary-bg)', color: issues > 0 ? 'var(--warning)' : 'var(--primary-dark)' }}>{issues}</span>
                          </td>
                          <td style={{ padding: '9px 10px', color: (r.summary.totalItcAtRisk || 0) > 0 ? 'var(--danger)' : 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtINR(r.summary.totalItcAtRisk || 0)}</td>
                          <td style={{ padding: '9px 10px', color: 'var(--text-2)' }}>{r.summary.complianceScore != null ? `${r.summary.complianceScore}%` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

<h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>Their activity</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {['When', 'Action', 'Details'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.activity.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: '14px 10px', color: 'var(--text-3)', textAlign: 'center' }}>No activity yet.</td></tr>
                    )}
                    {detail.activity.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                        <td style={{ padding: '9px 10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                        <td style={{ padding: '9px 10px' }}>
                          <span style={{ padding: '2px 9px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 600, background: 'var(--primary-bg)', color: 'var(--primary)' }}>{actionLabel(a.action)}</span>
                        </td>
                        <td style={{ padding: '9px 10px', color: 'var(--text-2)', fontSize: 12 }}>{a.detail ? JSON.stringify(a.detail) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NeuCard>
          </div>
        </div>
      )}
    </div>
  )
}