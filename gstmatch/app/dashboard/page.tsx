'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import { supabase } from '@/lib/supabase'
import { ReconciliationResult } from '@/lib/types'
import { fetchPlanStatus, formatExpiryDate, type PlanStatus, FREE_RECON_LIMIT } from '@/lib/pricing'

interface DashboardRow {
    id:         string
    period:     string
    gstin:      string
    created_at: string
    data:       ReconciliationResult
}

export default function DashboardPage() {

    const router = useRouter()
    const [rows, setRows] = useState<DashboardRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [plan, setPlan] = useState('free')
    const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null)
    const [reconCount, setReconCount] = useState(0)

    useEffect(() => {
        fetchResults()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchResults = async () => {
        setLoading(true)
        setError('')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/auth')
            return
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl || supabaseUrl.includes('your-project')) {
            setError('Supabase not configured. Dashboard requires a database connection.')
            setLoading(false)
            return
        }

        try {
            // Current plan + expiry + free-tier usage
            const status = await fetchPlanStatus(supabase, user.id)
            setPlanStatus(status)
            setPlan(status.effectivePlan)
            const currentPlan = status.effectivePlan

            if (currentPlan === 'free') {
                const { count } = await supabase
                    .from('reconciliation_results')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                setReconCount(count ?? 0)
            }

            // Reconciliation history
            const { data, error: dbErr } = await supabase
                .from('reconciliation_results')
                .select('id, period, gstin, created_at, data')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (dbErr) throw dbErr
            setRows((data || []) as DashboardRow[])
        } catch (err: any) {
            setError(err.message || 'Failed to load results')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
        } catch {
            return iso
        }
    }

    const freeUsed   = plan === 'free' ? reconCount : 0
    const remaining  = Math.max(FREE_RECON_LIMIT - freeUsed, 0)
    const limitReached = plan === 'free' && freeUsed >= FREE_RECON_LIMIT

    return (
        <>
            <NavBar />
            <main className="page-container">
                {/* Expiry / renewal banner */}
                {planStatus && (planStatus.plan === 'starter' || planStatus.plan === 'growth') && planStatus.daysRemaining !== null && planStatus.daysRemaining <= 3 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                        marginBottom: 22, padding: '14px 18px', borderRadius: 'var(--r-md)',
                        background: planStatus.daysRemaining > 0 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                        color: planStatus.daysRemaining > 0 ? '#92400e' : 'var(--danger)',
                        fontSize: 14, fontWeight: 600,
                        boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)',
                    }}>
                        <span>
                            {planStatus.daysRemaining > 0
                                ? `⏳ Your ${planStatus.plan} plan expires in ${planStatus.daysRemaining} day${planStatus.daysRemaining === 1 ? '' : 's'}${formatExpiryDate(planStatus.planExpiresAt) ? ' — on ' + formatExpiryDate(planStatus.planExpiresAt) : ''}. Renew now to keep your access.`
                                : `⛔ Your ${planStatus.plan} plan has expired. Renew now to restore your access.`}
                        </span>
                        <Link href="/pricing" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 700,
                            background: planStatus.daysRemaining > 0 ? '#92400e' : 'var(--danger)', color: 'white',
                            textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>
                            Renew Now →
                        </Link>
                    </div>
                )}
                {/* Page heading */}
                <div style={{ marginBottom: 22 }}>
                    <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-1)' }}>
                        Dashboard
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
                        Your account, plan and reconciliation history
                    </p>
                </div>

                {loading ? (
                    // ── Loading skeleton ──
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ height: 108, borderRadius: 'var(--r-md)', background: 'var(--neu-bg)', border: '1px solid rgba(200,210,230,0.45)', boxShadow: '0 2px 8px rgba(120,140,170,0.08)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ height: 56, borderRadius: 'var(--r-md)', background: 'var(--neu-bg)', border: '1px solid rgba(200,210,230,0.45)', boxShadow: '0 2px 8px rgba(120,140,170,0.08)', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        ))}
                        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
                    </div>
                ) : (
                    <>
                        {/* ── Current plan ── */}
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Current plan
                        </div>
                        <NeuCard padding="22px 24px" style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexWrap: 'wrap', gap: 16, marginBottom: 28,
                        }}>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, textTransform: 'capitalize', color: 'var(--text-1)' }}>
                                    {plan}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                                    {plan === 'free'
                                        ? `${freeUsed} of ${FREE_RECON_LIMIT} free reconciliations used${remaining === 1 ? ' — 1 run left' : ''}`
                                        : 'Unlimited reconciliations'}
                                </div>
                            </div>
                            {plan === 'free' ? (
                                <NeuButton variant="primary" onClick={() => router.push('/pricing')}>
                                    ⚡ {limitReached ? 'Upgrade to continue' : 'Upgrade plan'} →
                                </NeuButton>
                            ) : (
                                <span style={{
                                    fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)',
                                    background: 'var(--primary-bg)',
                                    padding: '8px 16px', borderRadius: 'var(--r-pill)',
                                }}>
                                    ✓ Active — unlimited
                                </span>
                            )}
                        </NeuCard>

                        {/* ── Reconciliation history ── */}
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Reconciliation history
                        </div>

                        {error ? (
                            <NeuCard padding="24px">
                                <div style={{
                                    background: 'var(--danger-bg)', color: 'var(--danger)',
                                    padding: '12px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500,
                                }}>
                                    ⚠ {error}
                                </div>
                            </NeuCard>
                        ) : rows.length === 0 ? (
                            <NeuCard padding="44px 24px" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
                                    No reconciliations yet
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                                    Run your first reconciliation to see your results here
                                </div>
                                <NeuButton variant="primary" onClick={() => router.push('/upload')}>
                                    Start Reconciliation →
                                </NeuButton>
                            </NeuCard>
                        ) : (
                            <NeuCard padding="0" style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--neu-dark)' }}>
                                            {['Period', 'Date', 'Invoices', 'Matched', 'ITC at Risk', 'Compliance', ''].map(h => (
                                                <th key={h} style={{
                                                    padding: '11px 16px', fontSize: 11, fontWeight: 700,
                                                    color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em',
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map(row => {
                                            const summary = row.data?.summary
                                            return (
                                                <tr key={row.id} onClick={() => router.push(`/results/${row.id}`)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(200,210,230,0.4)', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(238,241,246,0.8)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                    <td style={{ padding: '13px 16px', fontWeight: 600, color: 'var(--text-1)' }}>{row.period}</td>
                                                    <td style={{ padding: '13px 16px', color: 'var(--text-3)' }}>{formatDate(row.created_at)}</td>
                                                    <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--text-2)' }}>{summary?.totalInvoices || '-'}</td>
                                                    <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>{summary?.matched || 0}</td>
                                                    <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>₹{(summary?.totalItcAtRisk || 0).toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '4px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 600,
                                                            background: (summary?.complianceScore || 0) >= 80 ? 'var(--primary-bg)' : (summary?.complianceScore || 0) >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                                                            color: (summary?.complianceScore || 0) >= 80 ? 'var(--primary)' : (summary?.complianceScore || 0) >= 50 ? 'var(--warning)' : 'var(--danger)',
                                                        }}>
                                                            {summary?.complianceScore || 0}/100
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                                                        <NeuButton size="sm" variant="ghost" onClick={() => router.push(`/results/${row.id}`)}>View</NeuButton>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </NeuCard>
                        )}
                    </>
                )}
            </main>
        </>
    )
}


