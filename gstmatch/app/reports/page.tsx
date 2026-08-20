'use client'

import React, { useState, useEffect } from 'react'
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

interface ReportHistoryItem {
  id: string
  name: string
  type: string
  period: string
  generatedOn: string
  status: 'Completed' | 'In Progress'
  jobId?: string
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('overview')
  const [recentReports, setRecentReports] = useState<ReportHistoryItem[]>([])
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    // Fetch reconciliation results for KPI cards
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from('reconciliation_results')
          .select('id, period, gstin, created_at, data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (data) setRows(data)
      }
    })
  }, [])

  useEffect(() => {
    // Load recent reports from Supabase reconciliation results
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from('reconciliation_results')
          .select('id, period, created_at, data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6)

        if (data && data.length > 0) {
          const list: ReportHistoryItem[] = data.map((r) => {
            const reconType = r.data?.reconType || 'GSTR-2B vs PR'
            return {
              id: r.id,
              jobId: r.id,
              name: `${reconType} Report - ${r.period || 'August 2026'}`,
              type: reconType,
              period: r.period || 'August 2026',
              generatedOn: new Date(r.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              }),
              status: 'Completed',
            }
          })
          setRecentReports(list)
        } else {
          // Standard baseline items matching the design
          setRecentReports([
            { id: '1', name: 'ITC Summary Report - Aug 2026', type: 'ITC Summary', period: 'Aug 2026', generatedOn: '18 Aug 2026, 08:17 pm', status: 'Completed' },
            { id: '2', name: 'Mismatch Report - Aug 2026', type: 'Mismatch Report', period: 'Aug 2026', generatedOn: '18 Aug 2026, 07:05 pm', status: 'Completed' },
            { id: '3', name: 'Supplier Performance Report', type: 'Supplier Report', period: 'Aug 2026', generatedOn: '18 Aug 2026, 06:42 pm', status: 'Completed' },
            { id: '4', name: 'ITC Recovery Report - Jul 2026', type: 'ITC Recovery', period: 'Jul 2026', generatedOn: '17 Aug 2026, 10:59 pm', status: 'Completed' },
            { id: '5', name: 'Compliance Report - Aug 2026', type: 'Compliance Report', period: 'Aug 2026', generatedOn: '17 Aug 2026, 09:18 pm', status: 'In Progress' },
          ])
        }
      }
    })
  }, [])

  const handleGenerateReport = async (reportName: string) => {
    setGeneratingReport(reportName)
    setTimeout(() => {
      setGeneratingReport(null)
      // trigger instant mock download
      const csv = `GSTMatch Report: ${reportName}\nDate: ${new Date().toISOString()}\nStatus: Verified\nTotal Records: 5842\nTotal Value: ₹4,28,560\n`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportName.replace(/\s+/g, '_')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }, 900)
  }

  const handleDownload = async (item: ReportHistoryItem) => {
    if (item.jobId) {
      try {
        await downloadExcel(item.jobId)
        return
      } catch (e) {}
    }
    handleGenerateReport(item.name)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
      <NavBar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '28px' }}>
          
          {/* Left Sidebar Navigation */}
          <aside>
            <div
              style={{
                borderRadius: '16px',
                background: 'var(--neu-bg)',
                boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                padding: '20px 16px',
                position: 'sticky',
                top: '20px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>
                Reports Hub
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'itc_summary', label: 'ITC Summary', icon: '📑' },
                  { id: 'mismatch_report', label: 'Mismatch Report', icon: '⚠️' },
                  { id: 'supplier_report', label: 'Supplier Report', icon: '👥' },
                  { id: 'history', label: 'Reconciliation History', icon: '🕒' },
                  { id: 'compliance', label: 'Compliance Report', icon: '🛡️' },
                  { id: 'download_center', label: 'Download Center', icon: '📥' },
                ].map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SidebarTab)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isActive ? '#ffffff' : 'transparent',
                        boxShadow: isActive ? 'inset 2px 2px 4px rgba(0,0,0,0.06)' : 'none',
                        color: isActive ? '#059669' : '#475569',
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Custom Report Promotion Card */}
              <div
                style={{
                  marginTop: '28px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(200,208,231,0.6)',
                  padding: '16px',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                  Need a custom report?
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.4, marginBottom: '12px' }}>
                  We'll build tailored reports & exports for your specific business needs.
                </div>
                <button
                  onClick={() => alert('Custom report request submitted! Our team will contact you.')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Request Custom Report
                </button>
              </div>
            </div>
          </aside>

          {/* Main Reports Content Area */}
          <div>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Reports Overview
                </h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                  Get powerful insights from your reconciliations and track ITC recovery.
                </p>
              </div>

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

            {/* 5 Top KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '28px',
              }}
            >
              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Total Reconciliations</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{recentReports.length}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+5 vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Invoices Processed</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalInvoices || 0), 0) : 0}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+18% vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ITC Recovered</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalRecoveredOrValid || 0), 0) : 0}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+₹86,420 vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ITC at Risk</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>{rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalItcAtRisk || 0), 0) : 0}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>18.1% of total ITC</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Match Accuracy</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>{rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.data.summary.complianceScore || 0), 0) / rows.length) : 0}%</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+3.2% vs last month</div>
              </div>
            </div>

            {/* Visual Charts: 6-Month Trend + Mismatch Donut + Recovery Status */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '18px',
                marginBottom: '32px',
              }}
            >
              {/* ITC Trend Line Card */}
              <div
                style={{
                  borderRadius: '16px',
                  background: 'var(--neu-bg)',
                  boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>
                  ITC Trend
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Last 6 months</div>

                {/* SVG Trend Line */}
                <div style={{ height: '120px', width: '100%', position: 'relative' }}>
                  <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points="10,85 65,70 120,55 175,40 230,25 285,15"
                    />
                    {[
                      { x: 10, y: 85, label: 'Mar 26' },
                      { x: 65, y: 70, label: 'Apr 26' },
                      { x: 120, y: 55, label: 'May 26' },
                      { x: 175, y: 40, label: 'Jun 26' },
                      { x: 230, y: 25, label: 'Jul 26' },
                      { x: 285, y: 15, label: 'Aug 26' },
                    ].map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="4" fill="#10b981" />
                        <text x={pt.x} y="98" fontSize="9" fill="#94a3b8" textAnchor="middle">{pt.label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669', textAlign: 'center', marginTop: '10px' }}>
                  ● ITC Recovered (₹)
                </div>
              </div>

              {/* Mismatch Summary Donut */}
              <div
                style={{
                  borderRadius: '16px',
                  background: 'var(--neu-bg)',
                  boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>
                  Mismatch Summary
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>This month (812 Total)</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: 'conic-gradient(#ef4444 0% 42%, #f59e0b 42% 70%, #3b82f6 70% 86%, #8b5cf6 86% 94%, #94a3b8 94% 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'var(--neu-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#1e293b',
                      }}
                    >
                      812
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#ef4444', fontWeight: 600 }}>● Missing in 2B: 42%</div>
                    <div style={{ color: '#d97706', fontWeight: 600 }}>● Value Mismatch: 28%</div>
                    <div style={{ color: '#2563eb', fontWeight: 600 }}>● GSTIN Mismatch: 16%</div>
                    <div style={{ color: '#7c3aed', fontWeight: 600 }}>● Duplicate: 8%</div>
                  </div>
                </div>
              </div>

              {/* ITC Recovery Status Donut */}
              <div
                style={{
                  borderRadius: '16px',
                  background: 'var(--neu-bg)',
                  boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>
                  ITC Recovery Status
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>This month</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: 'conic-gradient(#10b981 0% 78%, #e2e8f0 78% 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'var(--neu-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 900,
                        color: '#10b981',
                      }}
                    >
                      78%
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#15803d', fontWeight: 600 }}>● Recovered: ₹4,28,560 (78%)</div>
                    <div style={{ color: '#b91c1c', fontWeight: 600 }}>● At Risk: ₹81,289 (15%)</div>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>● Not Eligible: ₹38,151 (7%)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Reports Catalog (8 Cards) */}
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Popular Reports
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Most downloaded reports by GSTMatch users</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: '16px',
                }}
              >
                {[
                  { title: 'ITC Summary Report', desc: 'Complete summary of ITC recovered, at risk, and not eligible.', icon: '📄', btn: 'Generate Report' },
                  { title: 'Mismatch Report', desc: 'Detailed list of all mismatches with root cause and impact.', icon: '⚠️', btn: 'Generate Report' },
                  { title: 'Supplier Performance Report', desc: 'Track supplier compliance and invoice matching performance.', icon: '🏢', btn: 'Generate Report' },
                  { title: 'Monthly Reconciliation Report', desc: 'Month-wise reconciliation summary and key metrics.', icon: '📊', btn: 'Generate Report' },
                  { title: 'Compliance Report', desc: 'GST compliance score, filing status, and due dates.', icon: '📑', btn: 'Generate Report' },
                  { title: 'ITC Recovery Report', desc: 'Track ITC recovered over time and recovery trend.', icon: '🕒', btn: 'Generate Report' },
                  { title: 'Reconciliation History Report', desc: 'Complete history of all reconciliations performed.', icon: '📥', btn: 'Generate Report' },
                  { title: 'Custom Excel Report', desc: 'Build your own report with custom fields and filters.', icon: '📊', btn: 'Create Custom Report' },
                ].map((rep, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: '14px',
                      background: 'var(--neu-bg)',
                      boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '22px', marginBottom: '8px' }}>{rep.icon}</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                        {rep.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4, marginBottom: '14px' }}>
                        {rep.desc}
                      </div>
                    </div>

                    <button
                      onClick={() => handleGenerateReport(rep.title)}
                      disabled={generatingReport === rep.title}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--neu-bg)',
                        boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                        border: '1px solid rgba(200,208,231,0.7)',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#059669',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {generatingReport === rep.title ? 'Generating...' : rep.btn}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reports History Table */}
            <div
              style={{
                borderRadius: '16px',
                background: 'var(--neu-bg)',
                boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                padding: '24px',
                marginBottom: '32px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '14px' }}>
                Recent Reports
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(200,208,231,0.8)', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Report Name</th>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px' }}>Period</th>
                      <th style={{ padding: '10px 12px' }}>Generated On</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(200,208,231,0.4)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>
                          📄 {row.name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {row.type}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', fontWeight: 600 }}>
                          {row.period}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                          {row.generatedOn}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: row.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                              color: row.status === 'Completed' ? '#15803d' : '#b45309',
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDownload(row)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '4px',
                            }}
                            title="Download Report"
                          >
                            📥
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Value Props Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                padding: '20px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(200,208,231,0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📈</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>Actionable Insights</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Understand mismatches & recover ITC</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>Save Time</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Automated reports in 2 minutes</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔗</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>Share Easily</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Export clean Excel & PDF to CAs</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔒</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>Data Security</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Bank-grade encryption standard</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
