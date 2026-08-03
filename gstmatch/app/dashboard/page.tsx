'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import { supabase } from '@/lib/supabase'
import { ReconciliationResult } from '@/lib/types'

interface DashboardRow {
    id: string
    period: string
    gstin: string
    created_at: string
    data: ReconciliationResult
}

export default function DashboardPage() {
    const router = useRouter()
    const [rows, setRows] = useState<DashboardRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchResults()
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
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
        } catch {
            return iso
        }
    }

    return (
        <>
            <NavBar />
            <main className="page-container">
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
                        Reconciliation History
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
                        View and download past reconciliation reports
                    </p>
                </div>

                {loading && (
                    <NeuCard padding="32px">
                        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                            Loading...
                        </p>
                    </NeuCard>
                )}

                {error && (
                    <NeuCard padding="24px">
                        <div style={{
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            padding: '12px 16px',
                            borderRadius: 'var(--r-sm)',
                            fontSize: 13,
                            fontWeight: 500,
                        }}>
                            ⚠️ {error}
                        </div>
                    </NeuCard>
                )}

                {!loading && !error && rows.length === 0 && (
                    <NeuCard padding="48px">
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 8, fontWeight: 600 }}>
                                No reconciliations yet
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
                                Run your first reconciliation to see results here
                            </p>
                            <NeuButton variant="primary" onClick={() => router.push('/upload')}>
                                Start Reconciliation
                            </NeuButton>
                        </div>
                    </NeuCard>
                )}

                {!loading && !error && rows.length > 0 && (
                    <NeuCard padding="0" style={{ overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: 'var(--neu-bg)', borderBottom: '2px solid var(--neu-dark)' }}>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)' }}>Period</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)' }}>Date</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>Invoices</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>Matched</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>ITC at Risk</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>Score</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-2)' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => {
                                        const summary = row.data?.summary
                                        return (
                                            <tr
                                                key={row.id}
                                                style={{ borderBottom: '1px solid var(--neu-dark)', cursor: 'pointer' }}
                                                onClick={() => router.push(`/results/${row.id}`)}
                                            >
                                                <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-1)' }}>
                                                    {row.period}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>
                                                    {formatDate(row.created_at)}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-2)' }}>
                                                    {summary?.totalInvoices || '-'}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                                        {summary?.matched || 0}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>
                                                    ₹{(summary?.totalItcAtRisk || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 'var(--r-pill)',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        background: (summary?.complianceScore || 0) >= 80 ? 'var(--primary-bg)' : (summary?.complianceScore || 0) >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                                                        color: (summary?.complianceScore || 0) >= 80 ? 'var(--primary)' : (summary?.complianceScore || 0) >= 50 ? 'var(--warning)' : 'var(--danger)',
                                                    }}>
                                                        {summary?.complianceScore || 0}/100
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <NeuButton size="sm" variant="ghost" onClick={() => router.push(`/results/${row.id}`)}>
                                                        View
                                                    </NeuButton>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </NeuCard>
                )}
            </main>
        </>
    )
}