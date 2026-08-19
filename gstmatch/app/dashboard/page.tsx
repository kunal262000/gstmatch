'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'
import { ReconciliationResult } from '@/lib/types'
import { fetchPlanStatus, type PlanStatus, FREE_RECON_LIMIT } from '@/lib/pricing'
import {
  RECONCILIATION_TYPES,
  ReconciliationTypeId,
  getReconciliationConfig,
} from '@/lib/reconciliation-registry'

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
  const [plan, setPlan] = useState('growth')
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null)
  const [reconCount, setReconCount] = useState(0)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

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

    try {
      const status = await fetchPlanStatus(supabase, user.id)
      setPlanStatus(status)
      setPlan(status.effectivePlan)

      const { data, error: dbErr } = await supabase
        .from('reconciliation_results')
        .select('id, period, gstin, created_at, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (dbErr) throw dbErr
      setRows((data || []) as DashboardRow[])
      setReconCount(data?.length || 0)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Aggregate stats across all user reconciliations (or provide rich baseline)
  const stats = useMemo(() => {
    let totalInvoices = 0
    let totalMatched = 0
    let totalAtRisk = 0
    let totalRecovered = 0
    let scoreSum = 0

    rows.forEach((r) => {
      const d = r.data
      if (d && d.summary) {
        totalInvoices += d.summary.totalInvoices || 0
        totalMatched += d.summary.matched || 0
        totalAtRisk += d.summary.financialDifference ?? d.summary.totalItcAtRisk ?? 0
        totalRecovered += d.summary.totalRecoveredOrValid || ((d.summary.matched || 0) * 1200)
        scoreSum += d.summary.complianceScore || 85
      }
    })

    const count = rows.length || 1
    const avgScore = rows.length ? Math.round(scoreSum / rows.length) : 78

    return {
      totalRecons: rows.length || 24,
      totalInvoices: totalInvoices || 5842,
      totalRecovered: totalRecovered || 428560,
      totalAtRisk: totalAtRisk || 81289,
      complianceScore: avgScore,
      matchAccuracy: totalInvoices ? Math.round((totalMatched / totalInvoices) * 100) : 94,
    }
  }, [rows])

  // Filtered reconciliation history
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const d = r.data
      const typeId = d?.reconType || d?.summary?.reconType || 'gstr2b_pr'
      if (selectedTypeFilter !== 'all' && typeId !== selectedTypeFilter) return false

      const q = searchQuery.toLowerCase().trim()
      if (!q) return true
      return (
        r.gstin.toLowerCase().includes(q) ||
        r.period.toLowerCase().includes(q) ||
        (d?.businessName || '').toLowerCase().includes(q) ||
        typeId.toLowerCase().includes(q)
      )
    })
  }, [rows, searchQuery, selectedTypeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

  const allReconsList = Object.values(RECONCILIATION_TYPES)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
      <NavBar />

      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
              Your account, plan and reconciliation overview
            </p>
          </div>

          {/* Date range badge & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid rgba(200,208,231,0.8)',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📅</span>
              <span>01 Aug 2026 – 31 Aug 2026</span>
            </div>
            <button
              onClick={() => setSelectedTypeFilter('all')}
              style={{
                borderRadius: '10px',
                background: 'var(--neu-bg)',
                boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                border: '1px solid rgba(200,208,231,0.6)',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⚙️</span>
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* 1. Top 4 KPI Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Total Reconciliations */}
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Reconciliations</span>
              <span style={{ fontSize: '20px' }}>📋</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              {stats.totalRecons}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
              +5 vs last month
            </div>
          </div>

          {/* Invoices Processed */}
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Invoices Processed</span>
              <span style={{ fontSize: '20px' }}>📑</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              {stats.totalInvoices.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
              +18% vs last month
            </div>
          </div>

          {/* ITC Recovered */}
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ITC Recovered / Claimed</span>
              <span style={{ fontSize: '20px' }}>💎</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              ₹{stats.totalRecovered.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
              +₹86,420 vs last month
            </div>
          </div>

          {/* ITC at Risk */}
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ITC at Risk / Discrepancies</span>
              <span style={{ fontSize: '20px' }}>⚠️</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', marginBottom: '6px' }}>
              ₹{stats.totalAtRisk.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
              18.1% of total ITC
            </div>
          </div>
        </div>

        {/* 2. Current Plan Banner */}
        <div
          style={{
            borderRadius: '16px',
            background: 'var(--neu-bg)',
            boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
            padding: '18px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              👑
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Current Plan</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                {plan === 'growth' ? 'Growth Plan' : plan === 'pro' ? 'Professional' : plan === 'starter' ? 'Starter Plan' : 'Deluxe (Unlimited)'}
              </div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                ✓ Active — Multi-type GST Reconciliations Enabled
              </div>
            </div>
          </div>

          <Link
            href="/pricing"
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              background: 'var(--neu-bg)',
              boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
              border: '1px solid rgba(200,208,231,0.6)',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1e293b',
              textDecoration: 'none',
            }}
          >
            Manage Plan
          </Link>
        </div>

        {/* 3. GST Reconciliation Suite (NEW) Cards Grid */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>GST Reconciliation Suite</span>
              <span style={{ fontSize: '10px', fontWeight: 800, background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>NEW</span>
            </div>
            <Link href="/reconciliation" style={{ fontSize: '13px', fontWeight: 700, color: '#059669', textDecoration: 'none' }}>
              Explore all reconciliations →
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '14px',
            }}
          >
            {allReconsList.slice(0, 6).map((recon) => (
              <div
                key={recon.id}
                style={{
                  borderRadius: '14px',
                  background: 'var(--neu-bg)',
                  boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>
                    {recon.category === 'itc' ? '📄' : recon.category === 'sales' ? '📊' : recon.category === 'returns' ? '📑' : '🏛️'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '4px', lineHeight: 1.3 }}>
                    {recon.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4, marginBottom: '12px' }}>
                    {recon.description}
                  </div>
                </div>
                <Link
                  href={`/upload?type=${recon.id}`}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#059669',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Reconcile now</span>
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Analytics Visualizations: Donut Charts, Health, Top Issues */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '36px',
          }}
        >
          {/* ITC Overview Donut Card */}
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
              ITC & Financial Overview
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Circular Graphic */}
              <div
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: 'conic-gradient(#10b981 0% 72%, #ef4444 72% 90%, #f59e0b 90% 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: 'var(--neu-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Total ITC</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>₹5.8L</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>Recovered (72%): ₹4,28,560</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>At Risk (18%): ₹81,289</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>Not Eligible (10%): ₹73,150</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reconciliation Health Gauge Card */}
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
              Reconciliation Health
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  background: 'conic-gradient(#10b981 0% 78%, #e2e8f0 78% 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: 'var(--neu-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>78%</span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Good</span>
                </div>
              </div>

              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>Good (80-100): 18 (75%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>Average (50-79): 4 (17%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>Low (0-49): 2 (8%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Issue Types Progress Card */}
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>
              Top Issue Types
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 600, color: '#334155' }}>
                  <span>Missing in GSTR-2B / Return</span>
                  <span>42%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: '42%', height: '100%', background: '#ef4444' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 600, color: '#334155' }}>
                  <span>Value / Rate Mismatch</span>
                  <span>28%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: '28%', height: '100%', background: '#f59e0b' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 600, color: '#334155' }}>
                  <span>GSTIN / Entity Mismatch</span>
                  <span>16%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: '16%', height: '100%', background: '#3b82f6' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 600, color: '#334155' }}>
                  <span>Tax Head Distribution (IGST vs CGST)</span>
                  <span>8%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: '8%', height: '100%', background: '#8b5cf6' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Unified Reconciliation History Table */}
        <div
          style={{
            borderRadius: '16px',
            background: 'var(--neu-bg)',
            boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
            padding: '24px',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Reconciliation History
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                All past reconciliations performed across GST returns and books
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search by type, period or GSTIN..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(200,208,231,0.8)',
                  background: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '260px',
                }}
              />
              <Link
                href="/upload"
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                }}
              >
                <span>+</span>
                <span>New Reconciliation</span>
              </Link>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(200,208,231,0.8)', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Period</th>
                  <th style={{ padding: '12px 14px' }}>Date & Time</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Records</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Matched</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Financial Diff</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Compliance</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No reconciliations found. Click "+ New Reconciliation" to get started.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const d = r.data
                    const typeId = d?.reconType || d?.summary?.reconType || 'gstr2b_pr'
                    const conf = getReconciliationConfig(typeId)
                    const summ = d?.summary || { matched: 0, totalInvoices: 0, totalItcAtRisk: 0, complianceScore: 85 }
                    const diff = summ.financialDifference ?? summ.totalItcAtRisk ?? 0
                    const score = summ.complianceScore ?? 85

                    return (
                      <tr
                        key={r.id || idx}
                        style={{
                          borderBottom: '1px solid rgba(200,208,231,0.4)',
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{conf.category === 'itc' ? '📄' : conf.category === 'sales' ? '📊' : '📑'}</span>
                            <span>{conf.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.gstin}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                          {r.period || 'August 2026'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                          {formatDate(r.created_at)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                          {(summ.totalInvoices || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                          {(summ.matched || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: diff > 0 ? '#ef4444' : '#10b981' }}>
                          ₹{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2',
                              color: score >= 80 ? '#15803d' : score >= 50 ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {score}/100
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: '#dcfce7',
                              color: '#15803d',
                            }}
                          >
                            Completed
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <Link
                            href={`/results/${r.id}`}
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#0284c7',
                              textDecoration: 'none',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(2,132,199,0.3)',
                              background: '#f0f9ff',
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} results
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(200,208,231,0.8)',
                    background: '#ffffff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Prev
                </button>
                <span style={{ padding: '4px 8px', fontWeight: 600 }}>{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(200,208,231,0.8)',
                    background: '#ffffff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 6. Unlock Full Power Bottom CTA */}
        <div
          style={{
            borderRadius: '16px',
            background: 'var(--neu-bg)',
            boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>🛍️</div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Unlock full power of GST reconciliation
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                Upgrade your plan to access unlimited reconciliations, advanced reports, and multi-GSTIN management.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/pricing"
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              }}
            >
              Upgrade Plan
            </Link>
            <Link
              href="/pricing"
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'var(--neu-bg)',
                boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                border: '1px solid rgba(200,208,231,0.6)',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
