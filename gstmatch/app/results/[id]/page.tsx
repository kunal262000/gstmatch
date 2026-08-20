'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import MetricCard from '@/components/MetricCard'
import SupplierTable from '@/components/SupplierTable'
import InvoiceTable from '@/components/InvoiceTable'
import TrustBadges from '@/components/TrustBadges'
import { getResult, downloadExcel, downloadPDF } from '@/lib/api'
import { ReconciliationResult, SummaryReconciliationResult } from '@/lib/types'
import { getReconciliationConfig } from '@/lib/reconciliation-registry'

export default function ResultsPage() {
  const { id } = useParams()
  const jobId = typeof id === "string" ? id : (id?.[0] || "")
  const router = useRouter()
  const [data, setData] = useState<ReconciliationResult | SummaryReconciliationResult | null>(null)
  const [err, setErr] = useState('')
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    let cancelled = false
    const attempts = 3
    ;(async () => {
      for (let i = 0; i < attempts; i++) {
        try {
          const d = await getResult(jobId)
          if (!cancelled) setData(d)
          return
        } catch (e) {
          if (i === attempts - 1) {
            if (!cancelled) setErr((e as Error).message)
          } else {
            await new Promise((r) => setTimeout(r, 1200))
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (err) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
        <NavBar />
        <main style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '80px', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            Reconciliation Result Not Found
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
            {err}
          </p>
          <Link
            href="/upload"
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              background: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}
          >
            Start New Reconciliation
          </Link>
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
        <NavBar />
        <main style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '100px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #10b981',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
            Loading reconciliation results...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </main>
      </div>
    )
  }

  const isSummary = data && (data as any).engine === 'summary'
  const reconType = data.reconType || (data as any).summary?.reconType || 'gstr2b_pr'
  const config = getReconciliationConfig(reconType)
  
  // For invoice-engine results, extract summary data
  // For summary-engine results, use line items
  const summary = !isSummary && data && 'summary' in data ? (data as ReconciliationResult).summary : { matched: 0, mismatched: 0, missingInGstr2b: 0, missingInPr: 0, totalItcAtRisk: 0, totalInvoices: 0, complianceScore: 0, financialDifference: 0, reconType: 'gstr2b_pr', matchAccuracy: 0, totalRecoveredOrValid: 0 } as any
  const suppliers = !isSummary && data && 'suppliers' in data ? (data as ReconciliationResult).suppliers : []
  const invoices = !isSummary && data && 'invoices' in data ? (data as ReconciliationResult).invoices : []
  const summarySections = !isSummary && data && 'summarySections' in data ? (data as ReconciliationResult).summarySections : []
  
  const financialDiff = summary 
    ? summary.totalItcAtRisk ?? (summary as any).financialDifference ?? 0
    : 0

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true)
    try {
      await downloadExcel(data.id)
    } catch (e) {
      alert('Failed to download Excel report')
    } finally {
      setDownloadingExcel(false)
    }
  }

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true)
    try {
      await downloadPDF(data.id)
    } catch (e) {
      alert('Failed to download PDF summary')
    } finally {
      setDownloadingPDF(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
      <NavBar />

      <main style={{ maxWidth: '1140px', margin: '0 auto', padding: '32px 20px 80px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#0284c7',
                  background: '#e0f2fe',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                {config.categoryLabel}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                Period: {data.period} • GSTIN: {data.gstin}
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {config.name} Results
            </h1>
          </div>

          {/* Action Download Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'var(--neu-bg)',
                boxShadow: '3px 3px 7px var(--neu-dark), -3px -3px 7px var(--neu-light)',
                border: '1px solid rgba(200,208,231,0.8)',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 700,
                cursor: downloadingExcel ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📊</span>
              <span>{downloadingExcel ? 'Generating...' : 'Download Excel'}</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📑</span>
              <span>{downloadingPDF ? 'Generating...' : 'Download PDF Summary'}</span>
            </button>
          </div>
        </div>

        {/* Financial Impact Banner */}
        <div
          style={{
            borderRadius: '16px',
            padding: '20px 24px',
            background: financialDiff > 0 ? '#fff1f2' : '#f0fdf4',
            border: financialDiff > 0 ? '1px solid #fecdd3' : '1px solid #bbf7d0',
            boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: financialDiff > 0 ? '#be123c' : '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {config.financialMetricLabel}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: financialDiff > 0 ? '#9f1239' : '#166534', margin: '4px 0' }}>
              ₹{financialDiff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '13px', color: financialDiff > 0 ? '#881337' : '#14532d' }}>
              {config.financialMetricDescription}
            </div>
          </div>

          {/* Compliance Score Pill */}
          <div
            style={{
              textAlign: 'center',
              padding: '12px 20px',
              borderRadius: '12px',
              background: '#ffffff',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Compliance Score
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: summary.complianceScore >= 80 ? '#10b981' : summary.complianceScore >= 50 ? '#f59e0b' : '#ef4444' }}>
              {summary.complianceScore} / 100
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {summary.complianceScore >= 80 ? 'Good Standing' : 'Action Needed'}
            </div>
          </div>
        </div>

        {/* 4 Top Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <MetricCard
            label="Total Records"
            value={summary.totalInvoices.toLocaleString('en-IN')}
            icon="📋"
            color="default"
          />
          <MetricCard
            label="Matched Records"
            value={summary.matched.toLocaleString('en-IN')}
            icon="✅"
            color="success"
          />
          <MetricCard
            label="Value Mismatches"
            value={summary.mismatched.toLocaleString('en-IN')}
            icon="⚠️"
            color="warning"
          />
          <MetricCard
            label={`Missing in ${config.file2.shortName}`}
            value={summary.missingInGstr2b.toLocaleString('en-IN')}
            icon="❌"
            color="danger"
          />
        </div>

        {/* 1. If Summary-Level Reconciliation (3B vs 1, 9 vs Books, 9C vs Books) */}
        {config.level === 'summary' && (summarySections || []).length > 0 && (
          <div
            style={{
              borderRadius: '16px',
              background: 'var(--neu-bg)',
              boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
              padding: '24px',
              marginBottom: '32px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              Return Section Comparison Table
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Table-wise cross-verification of taxable turnover and tax liabilities between {config.file1.shortName} and {config.file2.shortName}
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(200,208,231,0.8)', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Table / Section</th>
                    <th style={{ padding: '10px 12px' }}>Description</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>{config.file1.shortName}</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>{config.file2.shortName}</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Variance</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(summarySections || []).map((sec, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(200,208,231,0.4)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>
                        {sec.sectionId}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        <div style={{ fontWeight: 600 }}>{sec.sectionName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sec.description}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        ₹{sec.file1Value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        ₹{sec.file2Value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: sec.totalDifference > 0 ? '#ef4444' : '#10b981' }}>
                        ₹{sec.totalDifference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: sec.status === 'matched' ? '#dcfce7' : '#fee2e2',
                            color: sec.status === 'matched' ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {sec.status === 'matched' ? 'Matched' : 'Variance Found'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. If Invoice-Level Reconciliation (2B vs PR, 2A vs 2B, Sales vs 1, IMS vs 2B) */}
        {config.level === 'invoice' && (
          <>
            {/* Supplier / Customer summary table */}
            {suppliers.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <SupplierTable suppliers={suppliers} />
              </div>
            )}

            {/* Detailed Invoice Table */}
            {invoices.length > 0 && (
              <InvoiceTable
                invoices={invoices}
                reconType={reconType}
                file1Name={config.file1.shortName}
                file2Name={config.file2.shortName}
              />
            )}
          </>
        )}

        <TrustBadges />
      </main>
    </div>
  )
}
