'use client'

// MODIFIED FILE — replaces: gstmatch/app/results/[id]/page.tsx
//
// Your exact original behaviour is UNCHANGED for invoice-engine results:
// the retry-with-backoff fetch loop, the demo data path, the loading
// skeleton, the demo CSV/TXT download fallback, MetricCard/ITCAlert/
// SupplierTable rendering, the "what's inside your report" description.
//
// ONLY CHANGE: after fetching, checks `data.engine` — if it's "summary"
// (GSTR-3B vs GSTR-1, GSTR-1 vs GSTR-3B, GSTR-9 vs Books, GSTR-9C vs
// Books), renders the new <SummaryResults> component instead of the
// invoice-engine dashboard. The demo path (`id === 'demo'`) is untouched
// and always shows the original DEMO_DATA — that demo is specifically for
// the GSTR-2B vs PR flow and doesn't need a summary-engine equivalent.

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import MetricCard from '@/components/MetricCard'
import ITCAlert from '@/components/ITCAlert'
import SupplierTable from '@/components/SupplierTable'
import SummaryResults from '@/components/SummaryResults'
import NeuButton from '@/components/ui/NeuButton'
import { getResult, downloadExcel, downloadPDF } from '@/lib/api'
import { ReconciliationResult, SummaryReconciliationResult } from '@/lib/types'

type AnyResult = ReconciliationResult | SummaryReconciliationResult

function isSummary(r: AnyResult): r is SummaryReconciliationResult {
  return (r as SummaryReconciliationResult).engine === 'summary'
}

// ─── Demo data shown when jobId === 'demo' ──── (UNCHANGED)
const DEMO_DATA: ReconciliationResult = {
  id:           'demo',
  period:       'June 2025',
  gstin:        '27AAAAA0000A1Z5',
  businessName: 'Kunal Enterprises',
  processedAt:  new Date().toISOString(),
  reconType:    'gstr2b_vs_pr',
  engine:       'invoice',
  summary: {
    matched:          305,
    mismatched:        12,
    missingInGstr2b:   25,
    missingInPr:        8,
    totalItcAtRisk:  62750,
    totalInvoices:   342,
    complianceScore:   89,
  },
  suppliers: [
    { name: 'Mehta Fabrics Pvt Ltd',  gstin: '27AABCM1234F1Z5', invoiceCount: 8,  status: 'not_filed', itcAtRisk: 34200, stateCode: '27', stateName: 'Meghalaya' },
    { name: 'Rajesh Traders',          gstin: '24XYZRT5678G2Y6', invoiceCount: 12, status: 'filed',     itcAtRisk: 0,     stateCode: '24', stateName: 'Manipur' },
    { name: 'Patel Distributors',      gstin: '29ACDPD9012H3W7', invoiceCount: 3,  status: 'not_filed', itcAtRisk: 18750, stateCode: '29', stateName: 'Kerala' },
    { name: 'Kumar Enterprises',       gstin: '06AACKM2345J4V8', invoiceCount: 5,  status: 'mismatch',  itcAtRisk: 9800,  stateCode: '06', stateName: 'Haryana' },
    { name: 'Sharma & Sons',           gstin: '09AABCS6789K5U9', invoiceCount: 22, status: 'filed',     itcAtRisk: 0,     stateCode: '09', stateName: 'Uttar Pradesh' },
    { name: 'Verma Wholesale Pvt Ltd', gstin: '07AADVW3456L5T0', invoiceCount: 7,  status: 'not_filed', itcAtRisk: 0,     stateCode: '07', stateName: 'Delhi' },
  ],
  invoices: [],
}

export default function ResultsPage() {
  const { id }          = useParams<{ id: string }>()
  const [data, setData] = useState<AnyResult | null>(null)
  const [err,  setErr]  = useState('')

  useEffect(() => {
    if (id === 'demo') { setData(DEMO_DATA); return }
    // UNCHANGED — retry-with-backoff for a cold-starting deployed backend
    let cancelled = false
    const attempts = 3
    ;(async () => {
      for (let i = 0; i < attempts; i++) {
        try {
          const d = await getResult(id)
          if (!cancelled) setData(d)
          return
        } catch (e) {
          if (i === attempts - 1) {
            if (!cancelled) setErr((e as Error).message)
          } else {
            await new Promise(r => setTimeout(r, 1500))
          }
        }
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (err) return (
    <>
      <NavBar />
      <main className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
          Result not found
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>{err}</div>
        <Link href="/upload" className="neu-btn neu-btn-primary" style={{ padding: '12px 28px' }}>
          Start new reconciliation
        </Link>
      </main>
    </>
  )

  if (!data) return (
    <>
      <NavBar />
      <main className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
          border: '4px solid var(--primary-bg)',
          borderTop: '4px solid var(--primary)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Loading your results…</div>
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 92, borderRadius: 'var(--r-md)', background: 'var(--neu-bg)', border: '1px solid rgba(200,210,230,0.45)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ marginTop: 12, height: 190, borderRadius: 'var(--r-md)', background: 'var(--neu-bg)', border: '1px solid rgba(200,210,230,0.45)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      </main>
    </>
  )

  const handleDownloadExcel = async () => {
    if (!data) return
    if (data.id === 'demo') {
      const csvContent =
`GSTMatch Reconciliation Summary - June 2025
Business Name,Kunal Enterprises
GSTIN,27AAAAA0000A1Z5
Compliance Score,89%
Total Invoices,342

--- SHEET 1: Summary ---
Matched Invoices,305
Mismatched Invoices,12
Missing in GSTR-2B (At Risk),25
Extra in GSTR-2B,8
Total ITC at Risk,₹62750

--- SHEET 2: Mismatches ---
Supplier Name,GSTIN,Invoice No,Date,Your Amount,GSTR-2B Amount,Difference
Kumar Enterprises,06AACKM2345J4V8,INV-2025-089,2025-06-12,118000,108200,9800

--- SHEET 3: Missing Invoices ---
Supplier Name,GSTIN,Invoice Count,ITC at Risk,Status
Mehta Fabrics Pvt Ltd,27AABCM1234F1Z5,8,34200,Not Filed
Patel Distributors,29ACDPD9012H3W7,3,18750,Not Filed
Verma Wholesale Pvt Ltd,07AADVW3456L5T0,7,0,Not Filed
`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'GSTMatch_Demo_Report.csv'
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    try {
      await downloadExcel(data.id)
    } catch (e) {
      alert('Failed to download Excel report')
    }
  }

  const handleDownloadPDF = async () => {
    if (!data) return
    if (data.id === 'demo') {
      const textContent =
`GSTMatch - Reconciliation PDF Summary
====================================
Period: June 2025
Business Name: Kunal Enterprises
GSTIN: 27AAAAA0000A1Z5
Compliance Score: 89%
Total Invoices: 342
Matched Invoices: 305
Mismatched Invoices: 12
Missing in GSTR-2B (At Risk): 25
Extra in GSTR-2B: 8
Total ITC at Risk: ₹62,750

Supplier Summary:
- Mehta Fabrics Pvt Ltd (27AABCM1234F1Z5): 8 Invoices, ❌ Not Filed, ITC at Risk: ₹34,200
- Rajesh Traders (24XYZRT5678G2Y6): 12 Invoices, ✅ Filed, ITC at Risk: ₹0
- Patel Distributors (29ACDPD9012H3W7): 3 Invoices, ❌ Not Filed, ITC at Risk: ₹18,750
- Kumar Enterprises (06AACKM2345J4V8): 5 Invoices, ⚠️ Mismatch, ITC at Risk: ₹9,800
- Sharma & Sons (09AABCS6789K5U9): 22 Invoices, ✅ Filed, ITC at Risk: ₹0
- Verma Wholesale Pvt Ltd (07AADVW3456L5T0): 7 Invoices, ❌ Not Filed, ITC at Risk: ₹0
`;
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'GSTMatch_Demo_Summary.txt'
      a.click()
      URL.revokeObjectURL(url)
      return
    }
    try {
      await downloadPDF(data.id)
    } catch (e) {
      alert('Failed to download PDF summary')
    }
  }

  // ═══════════ NEW — summary-engine branch ═══════════
  if (isSummary(data)) {
    return (
      <>
        <NavBar />
        <main className="page-container">
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)' }}>
              Reconciliation results
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
              {data.period} • {data.gstin} • {data.businessName}
            </p>
          </div>

          <SummaryResults result={data} />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 20 }}>
            <NeuButton onClick={handleDownloadExcel}>📥 Download Excel report</NeuButton>
            <NeuButton onClick={handleDownloadPDF}>📄 Download PDF summary</NeuButton>
            <Link href="/upload" className="neu-btn" style={{ padding: '11px 20px', fontSize: 14 }}>
              🔄 New reconciliation
            </Link>
          </div>
        </main>
      </>
    )
  }

  // ═══════════ EXISTING — invoice-engine branch (UNCHANGED) ═══════════
  const summary = data?.summary || {
    matched: 0, mismatched: 0, missingInGstr2b: 0, missingInPr: 0,
    totalItcAtRisk: 0, totalInvoices: 0, complianceScore: 0,
  }
  const suppliers = data?.suppliers || []
  const atRiskSuppliers = suppliers.filter(s => s && s.itcAtRisk > 0).length
  const atRiskInvoices  = suppliers.filter(s => s && s.itcAtRisk > 0).reduce((a, s) => a + (s.invoiceCount || 0), 0)

  return (
    <>
      <NavBar />

      <main className="page-container">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)' }}>
            Reconciliation results
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
            {data?.period || 'Unknown Period'} • {data?.gstin || 'No GSTIN'} • {data?.businessName || 'Unnamed Business'}
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--info-bg)', color: 'var(--info)',
            fontSize: 12, fontWeight: 600, padding: '4px 12px',
            borderRadius: 'var(--r-pill)', marginTop: 8,
          }}>
            📅 {(summary?.totalInvoices) || 0} invoices processed •{' '}
            Compliance score {(summary?.complianceScore) || 0}%
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 18 }}>
          <MetricCard icon="✅" value={summary.matched}         label="Matched"          color="success" />
          <MetricCard icon="⚠️" value={summary.mismatched}      label="Mismatch"         color="warning" />
          <MetricCard icon="❌" value={summary.missingInGstr2b} label="Missing in GSTR-2B" color="danger" />
          <MetricCard icon="🔍" value={summary.missingInPr}     label="Extra in GSTR-2B" color="info" />
        </div>

        {summary.totalItcAtRisk > 0 && (
          <div style={{ marginBottom: 20 }}>
            <ITCAlert
              amount={summary.totalItcAtRisk}
              supplierCount={atRiskSuppliers}
              invoiceCount={atRiskInvoices}
            />
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <SupplierTable suppliers={suppliers} />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
          <NeuButton onClick={handleDownloadExcel}>📥 Download Excel report</NeuButton>
          <NeuButton onClick={handleDownloadPDF}>📄 Download PDF summary</NeuButton>
          <Link href="/upload" className="neu-btn" style={{ padding: '11px 20px', fontSize: 14 }}>
            🔄 New reconciliation
          </Link>
        </div>

        <div className="neu-inset" style={{
          padding: '16px 20px', marginTop: 20,
          background: 'var(--neu-bg)', borderRadius: 'var(--r-sm)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
            📊 What&apos;s inside your Mismatch Report download:
          </div>
          <ul style={{ fontSize: 12, color: 'var(--text-2)', paddingLeft: 18, lineHeight: 1.6 }}>
            <li><strong>Sheet 1 — Summary:</strong> Total matched, mismatched, ITC at risk, and period covered.</li>
            <li><strong>Sheet 2 — Mismatches:</strong> Every invoice where amounts don&apos;t agree, with differences highlighted.</li>
            <li><strong>Sheet 3 — Missing Invoices:</strong> Every invoice where supplier hasn&apos;t filed, grouped by supplier.</li>
          </ul>
        </div>
      </main>
    </>
  )
}
