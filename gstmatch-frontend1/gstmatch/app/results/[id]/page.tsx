'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import MetricCard from '@/components/MetricCard'
import ITCAlert from '@/components/ITCAlert'
import SupplierTable from '@/components/SupplierTable'
import NeuButton from '@/components/ui/NeuButton'
import { getResult, downloadExcel, downloadPDF } from '@/lib/api'
import { ReconciliationResult } from '@/lib/types'

// ─── Demo data shown when jobId === 'demo' ────
const DEMO_DATA: ReconciliationResult = {
  id:           'demo',
  period:       'June 2025',
  gstin:        '27AAAAA0000A1Z5',
  businessName: 'Kunal Enterprises',
  processedAt:  new Date().toISOString(),
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
    { name: 'Mehta Fabrics Pvt Ltd',  gstin: '27AABCM1234F1Z5', invoiceCount: 8,  status: 'not_filed', itcAtRisk: 34200 },
    { name: 'Rajesh Traders',          gstin: '24XYZRT5678G2Y6', invoiceCount: 12, status: 'filed',     itcAtRisk: 0     },
    { name: 'Patel Distributors',      gstin: '29ACDPD9012H3W7', invoiceCount: 3,  status: 'not_filed', itcAtRisk: 18750 },
    { name: 'Kumar Enterprises',       gstin: '06AACKM2345J4V8', invoiceCount: 5,  status: 'mismatch',  itcAtRisk: 9800  },
    { name: 'Sharma & Sons',           gstin: '09AABCS6789K5U9', invoiceCount: 22, status: 'filed',     itcAtRisk: 0     },
    { name: 'Verma Wholesale Pvt Ltd', gstin: '07AADVW3456L5T0', invoiceCount: 7,  status: 'not_filed', itcAtRisk: 0     },
  ],
  invoices: [],
}

export default function ResultsPage() {
  const { id }          = useParams<{ id: string }>()
  const [data, setData] = useState<ReconciliationResult | null>(null)
  const [err,  setErr]  = useState('')

  useEffect(() => {
    if (id === 'demo') { setData(DEMO_DATA); return }
    getResult(id)
      .then(setData)
      .catch(e => setErr(e.message))
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
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    </>
  )

  const { summary, suppliers } = data
  const atRiskSuppliers  = suppliers.filter(s => s.itcAtRisk > 0).length
  const atRiskInvoices   = suppliers.filter(s => s.itcAtRisk > 0).reduce((a, s) => a + s.invoiceCount, 0)

  return (
    <>
      <NavBar />

      <main className="page-container">
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>
            Reconciliation results
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
            {data.period} • {data.gstin} • {data.businessName}
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--info-bg)', color: 'var(--info)',
            fontSize: 12, fontWeight: 600, padding: '4px 12px',
            borderRadius: 'var(--r-pill)', marginTop: 8,
          }}>
            📅 {summary.totalInvoices} invoices processed •{' '}
            Compliance score {summary.complianceScore}%
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <MetricCard icon="✅" value={summary.matched}         label="Matched"          color="success" />
          <MetricCard icon="⚠️" value={summary.mismatched}      label="Mismatch"         color="warning" />
          <MetricCard icon="❌" value={summary.missingInGstr2b} label="Supplier not filed" color="danger" />
          <MetricCard icon="🔍" value={summary.missingInPr}     label="Not in your books" />
        </div>

        {/* ITC Alert */}
        {summary.totalItcAtRisk > 0 && (
          <div style={{ marginBottom: 20 }}>
            <ITCAlert
              amount={summary.totalItcAtRisk}
              supplierCount={atRiskSuppliers}
              invoiceCount={atRiskInvoices}
            />
          </div>
        )}

        {/* Supplier table */}
        <div style={{ marginBottom: 20 }}>
          <SupplierTable suppliers={suppliers} />
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
          <NeuButton onClick={() => downloadExcel(data.id)}>
            📥 Download Excel report
          </NeuButton>
          <NeuButton onClick={() => downloadPDF(data.id)}>
            📄 Download PDF summary
          </NeuButton>
          <Link href="/upload" className="neu-btn" style={{ padding: '11px 20px', fontSize: 14 }}>
            🔄 New reconciliation
          </Link>
        </div>
      </main>
    </>
  )
}
