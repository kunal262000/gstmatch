'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import MetricCard from '@/components/MetricCard'

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

interface Overview {
  stats: {
    totalUsers: number
    paidUsers: number
    totalReconciliations: number
    activityCount: number
  }
  users: AdminUser[]
  activity: ActivityRow[]
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Growth',
  deluxe: 'Deluxe',
}

const ACTIVITY_LABELS: Record<string, string> = {
  signup: 'Signed up',
  login: 'Logged in',
  upload: 'Reconciliation',
  payment: 'Payment',
  admin_plan_change: 'Admin: plan change',
}

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')


  // Per-user plan dropdown state so admins can preview changes before saving.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadOverview = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      if (res.status === 401 || res.status === 403) {
        setForbidden(true)
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Failed to load admin data')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
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
      await loadOverview() // refresh stats + log
    } catch (e: any) {
      setError(e.message || 'Failed to update plan')
    } finally {
      setSaving(null)
    }
  }

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const actionLabel = (action: string) => ACTIVITY_LABELS[action] || action

  return (
    <>
      <NavBar />
      <main className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)' }}>Admin Dashboard</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 5 }}>
              Users, plans and activity across your workspace.
            </p>
          </div>
          <button className="neu-btn" onClick={loadOverview} style={{ cursor: 'pointer', padding: '10px 18px', fontSize: 13 }}>
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px 16px',
            borderRadius: 'var(--r-sm)', fontSize: 13, marginBottom: 20, fontWeight: 500,
          }}>
            ⚠️ {error}
          </div>
        )}

        {forbidden && (
          <NeuCard padding="40px" style={{ textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h2 style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
              Access restricted
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 24 }}>
              This dashboard is only available to workspace administrators.
              If you believe this is a mistake, please contact your account owner.
            </p>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span className="neu-btn neu-btn-primary" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 14, fontWeight: 600 }}>
                ← Back to Home
              </span>
            </Link>
          </NeuCard>
        )}

        {data && !forbidden && (
          <>
            {/* ── Stats ─────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 18, marginBottom: 28 }}>
              <MetricCard icon="👥" value={data.stats.totalUsers} label="Total Users" color="info" />
              <MetricCard icon="💳" value={data.stats.paidUsers} label="Active Paid Plans" color="success" />
              <MetricCard icon="🧾" value={data.stats.totalReconciliations} label="Reconciliations" color="warning" />
              <MetricCard icon="📈" value={data.stats.activityCount} label="Logged Activities" color="default" />
            </div>

            {/* ── Users table ───────────────────────────────── */}
            <NeuCard padding="24px" style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                Users
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
                Click a plan and “Apply” to change it (paid changes last 30 days).
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Email', 'Plan', 'Expires', 'Recons', 'Joined', ''].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontWeight: 600 }}>
                          {u.email || '—'}
                          {u.is_admin ? ' 🛡️' : ''}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            className="neu-input"
                            style={{ padding: '6px 10px', fontSize: 13, width: 130 }}
                            value={drafts[u.id] ?? u.plan}
                            onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                          >
                            {Object.entries(PLAN_NAMES).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{fmtDate(u.plan_expires_at)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-2)' }}>{u.usage_count ?? 0}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{fmtDate(u.created_at)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {drafts[u.id] !== undefined && drafts[u.id] !== u.plan && (
                            <button
                              className="neu-btn neu-btn-primary"
                              disabled={saving === u.id}
                              onClick={() => savePlan(u.id)}
                              style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
                            >
                              {saving === u.id ? '…' : 'Apply'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NeuCard>

            {/* ── Activity log ───────────────────────────────────── */}
            <NeuCard padding="24px">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                Activity log
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
                Signups, reconciliations, payments and admin actions.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['When', 'User', 'Action', 'Details'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(200,210,230,0.55)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.activity.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '18px 16px', color: 'var(--text-3)', textAlign: 'center' }}>
                          No activity recorded yet.
                        </td>
                      </tr>
                    )}
                    {data.activity.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.4)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontWeight: 600 }}>{a.email || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600,
                            background: 'var(--primary-bg)', color: 'var(--primary)',
                          }}>
                            {actionLabel(a.action)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: 12 }}>
                          {a.detail ? JSON.stringify(a.detail) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NeuCard>
          </>
        )}
      </main>
    </>
  )
}
