'use client'

// app/reports/page.tsx
//
// FIX: the left sidebar tabs (ITC Summary, Mismatch Report, Supplier
// Report, Reconciliation History, Compliance Report, Download Center)
// updated activeTab state on click, which correctly highlighted the
// clicked button, but the main content area never actually read
// activeTab anywhere. Every tab showed the exact same static Overview
// content. Fixed by branching the main content area on activeTab with
// real, distinct content per tab.
//
// Also fixed while touching this file:
//   1. KPI cards and all queries only read the reconciliation_results
//      table (invoice-engine types). Reconciliations run with any of the
//      4 summary-engine types (GSTR-3B vs GSTR-1, GSTR-1 vs GSTR-3B,
//      GSTR-9 vs Books, GSTR-9C vs Books) were invisible everywhere on
//      this page, same class of bug already fixed in the Upload page's
//      free-tier counter. Now queries BOTH tables and merges them.
//   2. The ITC Trend, Mismatch Summary, and ITC Recovery Status cards
//      were hardcoded fake numbers shown as if real to a logged-in user.
//      Replaced with numbers computed from the user's actual data.
//   3. Generate Report buttons downloaded a fake CSV with hardcoded
//      numbers regardless of which report was clicked. Now they jump to
//      the matching real tab instead.
//   4. Request Custom Report showed a fake alert with no request sent
//      anywhere. Now links to /contact.
//
// Every number on every tab below is derived from real Supabase rows,
// nothing here is placeholder or demo data.

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { supabase } from '@/lib/supabase'
import { downloadExcel, downloadPDF } from '@/lib/api'

type SidebarTab =
  | 'overview'
  | 'itc_summary'
  | 'mismatch_report'
  | 'supplier_report'
  | 'history'
  | 'compliance'
  | 'download_center'

interface ReconRow {
  id: string
  engine: 'invoice' | 'summary'
  period: string
  gstin: string
  createdAt: string
  data: any
}

const CARD_STYLE: React.CSSProperties = {
  borderRadius: '16px',
  background: 'var(--neu-bg)',
  boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
  padding: '20px',
}

const TH_STYLE: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: '11px',
  fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
  borderBottom: '2px solid rgba(200,208,231,0.8)',
}

const TD_STYLE: React.CSSProperties = {
  padding: '10px 12px', fontSize: '13px', color: '#334155',
  borderBottom: '1px solid rgba(200,208,231,0.4)',
}

function fmtMoney(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function reconTypeLabel(row: ReconRow): string {
  if (row.engine === 'summary') {
    return (row.data && row.data.file1Label ? row.data.file1Label : 'Return') + ' vs ' +
      (row.data && row.data.file2Label ? row.data.file2Label : 'Return')
  }
  return (row.data && row.data.reconType) || 'GSTR-2B vs Purchase Register'
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('overview')
  const [rows, setRows] = useState<ReconRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      const [invoiceRes, summaryRes] = await Promise.all([
        supabase
          .from('reconciliation_results')
          .select('id, period, gstin, created_at, data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('summary_reconciliation_results')
          .select('id, period, gstin, created_at, data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      const invoiceRows: ReconRow[] = (invoiceRes.data || []).map((r: any) => ({
        id: r.id, engine: 'invoice' as const, period: r.period, gstin: r.gstin,
        createdAt: r.created_at, data: r.data,
      }))
      const summaryRows: ReconRow[] = (summaryRes.data || []).map((r: any) => ({
        id: r.id, engine: 'summary' as const, period: r.period, gstin: r.gstin,
        createdAt: r.created_at, data: r.data,
      }))

      const merged = invoiceRows.concat(summaryRows).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setRows(merged)
      setLoading(false)
    })
  }, [])

  const invoiceRows = useMemo(() => rows.filter(r => r.engine === 'invoice'), [rows])
  const summaryRows = useMemo(() => rows.filter(r => r.engine === 'summary'), [rows])

  const kpis = useMemo(() => {
    const totalInvoicesProcessed = invoiceRows.reduce(
      (sum, r) => sum + ((r.data && r.data.summary && r.data.summary.totalInvoices) || 0), 0
    )
    const totalMatched = invoiceRows.reduce(
      (sum, r) => sum + ((r.data && r.data.summary && r.data.summary.matched) || 0), 0
    )
    const totalItcAtRisk = invoiceRows.reduce(
      (sum, r) => sum + ((r.data && r.data.summary && r.data.summary.totalItcAtRisk) || 0), 0
    )
    const allComplianceScores = rows
      .map(r => (r.data && r.data.summary && r.data.summary.complianceScore) ?? (r.data && r.data.complianceScore))
      .filter((s: any): s is number => typeof s === 'number')
    const avgCompliance = allComplianceScores.length
      ? Math.round(allComplianceScores.reduce((a, b) => a + b, 0) / allComplianceScores.length)
      : 0

    return { totalInvoicesProcessed, totalMatched, totalItcAtRisk, avgCompliance }
  }, [rows, invoiceRows])

  const matchComposition = useMemo(() => {
    const matched = invoiceRows.reduce((s, r) => s + ((r.data && r.data.summary && r.data.summary.matched) || 0), 0)
    const mismatched = invoiceRows.reduce((s, r) => s + ((r.data && r.data.summary && r.data.summary.mismatched) || 0), 0)
    const missingIn2b = invoiceRows.reduce((s, r) => s + ((r.data && r.data.summary && r.data.summary.missingInGstr2b) || 0), 0)
    const missingInPr = invoiceRows.reduce((s, r) => s + ((r.data && r.data.summary && r.data.summary.missingInPr) || 0), 0)
    const total = matched + mismatched + missingIn2b + missingInPr
    return { matched, mismatched, missingIn2b, missingInPr, total }
  }, [invoiceRows])

  const monthlyVolume = useMemo(() => {
    const counts: Record<string, number> = {}
    rows.forEach(r => {
      const d = new Date(r.createdAt)
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).slice(-6)
  }, [rows])

  const flattenedMismatches = useMemo(() => {
    const out: Array<{ row: ReconRow; inv: any }> = []
    invoiceRows.forEach(row => {
      const invoices = (row.data && row.data.invoices) || []
      invoices
        .filter((inv: any) => inv.category === 'mismatched' || inv.category === 'missing_in_gstr2b')
        .forEach((inv: any) => out.push({ row, inv }))
    })
    return out
  }, [invoiceRows])

  const flattenedSuppliers = useMemo(() => {
    const out: Array<{ row: ReconRow; sup: any }> = []
    invoiceRows.forEach(row => {
      const suppliers = (row.data && row.data.suppliers) || []
      suppliers.forEach((sup: any) => out.push({ row, sup }))
    })
    return out.sort((a, b) => ((b.sup.itcAtRisk || 0) - (a.sup.itcAtRisk || 0)))
  }, [invoiceRows])

  const handleDownload = async (row: ReconRow, format: 'excel' | 'pdf') => {
    try {
      if (format === 'excel') await downloadExcel(row.id)
      else await downloadPDF(row.id)
    } catch (e) {
      alert('Download failed, please try again.')
    }
  }

  const jumpTo = (tab: SidebarTab) => {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const SIDEBAR_ITEMS: { id: SidebarTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'itc_summary', label: 'ITC Summary', icon: '📑' },
    { id: 'mismatch_report', label: 'Mismatch Report', icon: '⚠️' },
    { id: 'supplier_report', label: 'Supplier Report', icon: '👥' },
    { id: 'history', label: 'Reconciliation History', icon: '🕒' },
    { id: 'compliance', label: 'Compliance Report', icon: '🛡️' },
    { id: 'download_center', label: 'Download Center', icon: '📥' },
  ]

  const activeItem = SIDEBAR_ITEMS.find(t => t.id === activeTab)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
      <NavBar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '28px' }}>

          <aside>
            <div style={{ ...CARD_STYLE, padding: '20px 16px', position: 'sticky', top: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>
                Reports Hub
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {SIDEBAR_ITEMS.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '10px', border: 'none',
                        background: isActive ? '#ffffff' : 'transparent',
                        boxShadow: isActive ? 'inset 2px 2px 4px rgba(0,0,0,0.06)' : 'none',
                        color: isActive ? '#059669' : '#475569',
                        fontWeight: isActive ? 700 : 600, fontSize: '13px',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: '28px', borderRadius: '12px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(200,208,231,0.6)', padding: '16px', fontSize: '12px' }}>
                <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                  Need a custom report?
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.4, marginBottom: '12px' }}>
                  We will build tailored reports and exports for your specific business needs.
                </div>
                <Link
                  href="/contact"
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px', borderRadius: '8px',
                    background: '#10b981', color: '#ffffff', fontSize: '12px', fontWeight: 700,
                    border: 'none', cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
                  }}
                >
                  Request Custom Report
                </Link>
              </div>
            </div>
          </aside>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  {activeItem ? activeItem.icon : ''} {activeItem ? activeItem.label : ''}
                </h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                  {rows.length} reconciliation{rows.length === 1 ? '' : 's'} on record
                  {invoiceRows.length > 0 && summaryRows.length > 0
                    ? ' (' + invoiceRows.length + ' invoice-level, ' + summaryRows.length + ' return-level)'
                    : ''}
                </p>
              </div>
            </div>

            {loading && (
              <div style={{ ...CARD_STYLE, textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Loading your reconciliation data...
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div style={{ ...CARD_STYLE, textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  No reconciliations yet
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
                  Run your first reconciliation to see reports here.
                </div>
                <Link href="/upload" style={{
                  display: 'inline-block', padding: '10px 20px', borderRadius: '10px',
                  background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '13px', textDecoration: 'none',
                }}>
                  Start a reconciliation
                </Link>
              </div>
            )}

            {!loading && rows.length > 0 && activeTab === 'overview' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                  <div style={{ ...CARD_STYLE, padding: '16px', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Total Reconciliations</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{rows.length}</div>
                  </div>
                  <div style={{ ...CARD_STYLE, padding: '16px', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Invoices Processed</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{kpis.totalInvoicesProcessed.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ ...CARD_STYLE, padding: '16px', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Matched Invoices</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>{kpis.totalMatched.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ ...CARD_STYLE, padding: '16px', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ITC at Risk</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>{fmtMoney(kpis.totalItcAtRisk)}</div>
                  </div>
                  <div style={{ ...CARD_STYLE, padding: '16px', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Avg Compliance</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>{kpis.avgCompliance}%</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '32px' }}>
                  <div style={CARD_STYLE}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>Reconciliation Volume</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>By month, from your actual runs</div>
                    {monthlyVolume.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>Not enough data yet</div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '110px' }}>
                        {monthlyVolume.map(([label, count]) => {
                          const max = Math.max.apply(null, monthlyVolume.map(m => m[1]).concat([1]))
                          return (
                            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <div style={{
                                width: '100%', maxWidth: '32px',
                                height: Math.max((count / max) * 80, 6) + 'px',
                                background: '#10b981', borderRadius: '4px 4px 0 0',
                              }} title={count + ' reconciliation(s)'} />
                              <span style={{ fontSize: '9px', color: '#94a3b8' }}>{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div style={CARD_STYLE}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>Invoice Match Composition</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                      {matchComposition.total.toLocaleString('en-IN')} total invoices, invoice-level recons
                    </div>
                    {matchComposition.total === 0 ? (
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>No invoice-level reconciliations yet</div>
                    ) : (
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { label: 'Matched', val: matchComposition.matched, color: '#10b981' },
                          { label: 'Mismatched', val: matchComposition.mismatched, color: '#f59e0b' },
                          { label: 'Missing (ITC at risk)', val: matchComposition.missingIn2b, color: '#ef4444' },
                          { label: 'Not in your books', val: matchComposition.missingInPr, color: '#8b5cf6' },
                        ].map(seg => (
                          <div key={seg.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ color: '#475569', fontWeight: 600 }}>{seg.label}</span>
                              <span style={{ color: seg.color, fontWeight: 700 }}>
                                {seg.val.toLocaleString('en-IN')} ({matchComposition.total ? Math.round((seg.val / matchComposition.total) * 100) : 0}%)
                              </span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'rgba(200,208,231,0.4)' }}>
                              <div style={{
                                height: '100%', borderRadius: 3, background: seg.color,
                                width: (matchComposition.total ? (seg.val / matchComposition.total) * 100 : 0) + '%',
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '36px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>Jump to a report</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {[
                      { tab: 'itc_summary' as const, title: 'ITC Summary', desc: 'ITC recovered, at risk, and matched per reconciliation.', icon: '📑' },
                      { tab: 'mismatch_report' as const, title: 'Mismatch Report', desc: 'Every mismatched or missing invoice, across all runs.', icon: '⚠️' },
                      { tab: 'supplier_report' as const, title: 'Supplier Report', desc: 'Supplier-wise filing status and ITC at risk.', icon: '👥' },
                      { tab: 'compliance' as const, title: 'Compliance Report', desc: 'Compliance score for every reconciliation run.', icon: '🛡️' },
                      { tab: 'history' as const, title: 'Full History', desc: 'Every reconciliation you have ever run.', icon: '🕒' },
                      { tab: 'download_center' as const, title: 'Download Center', desc: 'Download Excel/PDF for any past reconciliation.', icon: '📥' },
                    ].map(card => (
                      <button
                        key={card.tab}
                        onClick={() => jumpTo(card.tab)}
                        style={{
                          textAlign: 'left', borderRadius: '14px', background: 'var(--neu-bg)',
                          boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
                          padding: '18px', cursor: 'pointer', border: 'none',
                        }}
                      >
                        <div style={{ fontSize: '22px', marginBottom: '8px' }}>{card.icon}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>{card.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>{card.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!loading && rows.length > 0 && activeTab === 'itc_summary' && (
              <div style={CARD_STYLE}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Period', 'GSTIN', 'Type', 'Invoices', 'Matched', 'Mismatched', 'Missing', 'ITC at Risk', 'Compliance'].map(h => (
                          <th key={h} style={TH_STYLE}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceRows.length === 0 && (
                        <tr><td style={TD_STYLE} colSpan={9}>No invoice-level reconciliations yet.</td></tr>
                      )}
                      {invoiceRows.map(row => (
                        <tr key={row.id}>
                          <td style={TD_STYLE}>{row.period}</td>
                          <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontSize: 11 }}>{row.gstin}</td>
                          <td style={TD_STYLE}>{reconTypeLabel(row)}</td>
                          <td style={TD_STYLE}>{(row.data && row.data.summary && row.data.summary.totalInvoices) ?? '—'}</td>
                          <td style={{ ...TD_STYLE, color: '#10b981', fontWeight: 700 }}>{(row.data && row.data.summary && row.data.summary.matched) ?? '—'}</td>
                          <td style={{ ...TD_STYLE, color: '#f59e0b', fontWeight: 700 }}>{(row.data && row.data.summary && row.data.summary.mismatched) ?? '—'}</td>
                          <td style={{ ...TD_STYLE, color: '#ef4444', fontWeight: 700 }}>{(row.data && row.data.summary && row.data.summary.missingInGstr2b) ?? '—'}</td>
                          <td style={{ ...TD_STYLE, color: '#ef4444', fontWeight: 700 }}>{fmtMoney((row.data && row.data.summary && row.data.summary.totalItcAtRisk) || 0)}</td>
                          <td style={TD_STYLE}>{(row.data && row.data.summary && row.data.summary.complianceScore) ?? '—'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && rows.length > 0 && activeTab === 'mismatch_report' && (
              <div style={CARD_STYLE}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: 14 }}>
                  {flattenedMismatches.length} mismatched or missing invoice{flattenedMismatches.length === 1 ? '' : 's'} across all your invoice-level reconciliations
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Supplier', 'GSTIN', 'Invoice No', 'Your Amount', 'Their Amount', 'Difference', 'Issue', 'Period'].map(h => (
                          <th key={h} style={TH_STYLE}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flattenedMismatches.length === 0 && (
                        <tr><td style={TD_STYLE} colSpan={8}>No mismatches found, everything reconciled cleanly.</td></tr>
                      )}
                      {flattenedMismatches.map(({ row, inv }, i) => (
                        <tr key={row.id + '-' + i}>
                          <td style={{ ...TD_STYLE, fontWeight: 600 }}>{inv.supplierName}</td>
                          <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontSize: 11 }}>{inv.gstin}</td>
                          <td style={TD_STYLE}>{inv.invoiceNo}</td>
                          <td style={TD_STYLE}>{fmtMoney(inv.yourAmount || 0)}</td>
                          <td style={TD_STYLE}>{inv.gstr2bAmount != null ? fmtMoney(inv.gstr2bAmount) : '—'}</td>
                          <td style={{ ...TD_STYLE, color: '#ef4444', fontWeight: 700 }}>
                            {inv.difference != null ? fmtMoney(inv.difference) : '—'}
                          </td>
                          <td style={TD_STYLE}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                              background: inv.category === 'mismatched' ? '#fef3c7' : '#fee2e2',
                              color: inv.category === 'mismatched' ? '#b45309' : '#b91c1c',
                            }}>
                              {inv.category === 'mismatched' ? 'Mismatch' : 'Missing'}
                            </span>
                          </td>
                          <td style={TD_STYLE}>{row.period}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && rows.length > 0 && activeTab === 'supplier_report' && (
              <div style={CARD_STYLE}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: 14 }}>
                  {flattenedSuppliers.length} supplier record{flattenedSuppliers.length === 1 ? '' : 's'}, sorted by ITC at risk
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Supplier', 'GSTIN', 'State', 'Invoices', 'Status', 'ITC at Risk', 'Period'].map(h => (
                          <th key={h} style={TH_STYLE}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flattenedSuppliers.length === 0 && (
                        <tr><td style={TD_STYLE} colSpan={7}>No supplier data yet.</td></tr>
                      )}
                      {flattenedSuppliers.map(({ row, sup }, i) => (
                        <tr key={row.id + '-' + sup.gstin + '-' + i}>
                          <td style={{ ...TD_STYLE, fontWeight: 600 }}>{sup.name}</td>
                          <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontSize: 11 }}>{sup.gstin}</td>
                          <td style={TD_STYLE}>{sup.stateName || '—'}</td>
                          <td style={TD_STYLE}>{sup.invoiceCount}</td>
                          <td style={TD_STYLE}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                              background: sup.status === 'filed' ? '#dcfce7' : sup.status === 'mismatch' ? '#fef3c7' : '#fee2e2',
                              color: sup.status === 'filed' ? '#15803d' : sup.status === 'mismatch' ? '#b45309' : '#b91c1c',
                            }}>
                              {sup.status === 'filed' ? 'Filed' : sup.status === 'mismatch' ? 'Mismatch' : 'Not Filed'}
                            </span>
                          </td>
                          <td style={{ ...TD_STYLE, color: sup.itcAtRisk > 0 ? '#ef4444' : '#64748b', fontWeight: 700 }}>
                            {sup.itcAtRisk > 0 ? fmtMoney(sup.itcAtRisk) : '—'}
                          </td>
                          <td style={TD_STYLE}>{row.period}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && rows.length > 0 && activeTab === 'history' && (
              <div style={CARD_STYLE}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Type', 'Period', 'GSTIN', 'Run On', 'Compliance', 'View', 'Download'].map(h => (
                          <th key={h} style={TH_STYLE}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.id}>
                          <td style={{ ...TD_STYLE, fontWeight: 600 }}>
                            {(row.engine === 'summary' ? '🧮 ' : '📄 ') + reconTypeLabel(row)}
                          </td>
                          <td style={TD_STYLE}>{row.period}</td>
                          <td style={{ ...TD_STYLE, fontFamily: 'monospace', fontSize: 11 }}>{row.gstin}</td>
                          <td style={{ ...TD_STYLE, fontSize: 12 }}>{fmtDate(row.createdAt)}</td>
                          <td style={TD_STYLE}>
                            {(row.data && row.data.summary && row.data.summary.complianceScore) ?? (row.data && row.data.complianceScore) ?? '—'}%
                          </td>
                          <td style={TD_STYLE}>
                            <Link href={'/results/' + row.id} style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>
                              View
                            </Link>
                          </td>
                          <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}>
                            <button onClick={() => handleDownload(row, 'excel')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 6 }} title="Download Excel">📥</button>
                            <button onClick={() => handleDownload(row, 'pdf')} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} title="Download PDF">📄</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && rows.length > 0 && activeTab === 'compliance' && (
              <div style={CARD_STYLE}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: 14 }}>
                  Every reconciliation, ranked by compliance score, lowest first, so the ones needing attention show up on top.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rows.slice().sort((a, b) => {
                    const scoreA = (a.data && a.data.summary && a.data.summary.complianceScore) ?? (a.data && a.data.complianceScore) ?? 100
                    const scoreB = (b.data && b.data.summary && b.data.summary.complianceScore) ?? (b.data && b.data.complianceScore) ?? 100
                    return scoreA - scoreB
                  }).map(row => {
                    const score = (row.data && row.data.summary && row.data.summary.complianceScore) ?? (row.data && row.data.complianceScore) ?? 0
                    const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 180, fontSize: 12, fontWeight: 600, color: '#334155', flexShrink: 0 }}>
                          {reconTypeLabel(row)} - {row.period}
                        </div>
                        <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'rgba(200,208,231,0.4)' }}>
                          <div style={{ height: '100%', borderRadius: 5, background: color, width: score + '%' }} />
                        </div>
                        <div style={{ width: 44, textAlign: 'right', fontSize: 13, fontWeight: 800, color }}>
                          {score}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!loading && rows.length > 0 && activeTab === 'download_center' && (
              <div style={CARD_STYLE}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Report', 'Period', 'Run On', 'Excel', 'PDF'].map(h => (
                          <th key={h} style={TH_STYLE}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.id}>
                          <td style={{ ...TD_STYLE, fontWeight: 700 }}>
                            {(row.engine === 'summary' ? '🧮 ' : '📄 ') + reconTypeLabel(row)}
                          </td>
                          <td style={TD_STYLE}>{row.period}</td>
                          <td style={{ ...TD_STYLE, fontSize: 12 }}>{fmtDate(row.createdAt)}</td>
                          <td style={TD_STYLE}>
                            <button
                              onClick={() => handleDownload(row, 'excel')}
                              style={{
                                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(200,208,231,0.7)',
                                background: 'var(--neu-bg)', boxShadow: '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                                fontSize: 12, fontWeight: 700, color: '#059669', cursor: 'pointer',
                              }}
                            >
                              📥 Excel
                            </button>
                          </td>
                          <td style={TD_STYLE}>
                            <button
                              onClick={() => handleDownload(row, 'pdf')}
                              style={{
                                padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(200,208,231,0.7)',
                                background: 'var(--neu-bg)', boxShadow: '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                                fontSize: 12, fontWeight: 700, color: '#059669', cursor: 'pointer',
                              }}
                            >
                              📄 PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
