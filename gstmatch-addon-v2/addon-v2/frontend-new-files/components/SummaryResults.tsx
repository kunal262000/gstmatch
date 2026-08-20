'use client'

// NEW FILE — place at: gstmatch/components/SummaryResults.tsx
//
// Renders results for the 4 SUMMARY-engine reconciliation types
// (GSTR-3B vs GSTR-1, GSTR-1 vs GSTR-3B, GSTR-9 vs Books, GSTR-9C vs Books).
// Counterpart to MetricCard/ITCAlert/SupplierTable for the invoice-engine
// types — used instead of them when result.engine === 'summary'.

import { useState } from 'react'
import { SummaryReconciliationResult } from '@/lib/types'

interface SummaryResultsProps {
  result: SummaryReconciliationResult
}

function fmt(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN')}`
}

export default function SummaryResults({ result }: SummaryResultsProps) {
  const [filter, setFilter] = useState<'all' | 'mismatch' | 'matched'>('mismatch')

  const filtered = result.lineItems.filter(li =>
    filter === 'all' ? true : li.status === filter
  )
  const hasDiscrepancy = Math.abs(result.totalDifference) > 0

  return (
    <div>
      {/* Top metric cards — matches the grid style used for invoice-engine results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 18 }}>
        <div className="neu-raised" style={{ padding: '18px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
            {result.file1Label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>
            {fmt(result.totalFile1Value)}
          </div>
        </div>
        <div className="neu-raised" style={{ padding: '18px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
            {result.file2Label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>
            {fmt(result.totalFile2Value)}
          </div>
        </div>
        <div className="neu-raised" style={{ padding: '18px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
            Matched sections
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
            {result.matchedSections}
          </div>
        </div>
        <div className="neu-raised" style={{ padding: '18px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
            Mismatched
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>
            {result.mismatchedSections}
          </div>
        </div>
      </div>

      {/* Difference banner — same visual weight as ITCAlert */}
      <div className="neu-raised" style={{
        padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: hasDiscrepancy ? 'var(--danger-bg)' : 'var(--primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          boxShadow: '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)',
        }}>
          {hasDiscrepancy ? '⚠️' : '✅'}
        </div>
        <div>
          <div style={{
            fontSize: 32, fontWeight: 800, lineHeight: 1,
            color: hasDiscrepancy ? 'var(--danger)' : 'var(--primary)',
          }}>
            {fmt(result.totalDifference)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
            {hasDiscrepancy
              ? `Difference between ${result.file1Label} and ${result.file2Label}`
              : `${result.file1Label} and ${result.file2Label} are fully reconciled`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            Compliance score: {result.complianceScore}%
          </div>
        </div>
      </div>

      {/* Section comparison table */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
            Section-by-section comparison
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['mismatch', 'matched', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="neu-btn"
                style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 500,
                  color: filter === f ? 'var(--primary)' : 'var(--text-3)',
                  boxShadow: filter === f
                    ? 'inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)'
                    : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                }}
              >
                {f === 'mismatch' ? '⚠️ Mismatches' : f === 'matched' ? '✅ Matched' : 'All sections'}
              </button>
            ))}
          </div>
        </div>

        <div className="neu-raised" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr 100px',
            padding: '10px 16px', borderBottom: '1px solid var(--neu-dark)',
            background: 'rgba(200,208,231,0.15)',
          }}>
            {['Section', result.file1Label, result.file2Label, 'Difference', 'Status'].map(h => (
              <span key={h} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{h}</span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              No sections in this category
            </div>
          ) : (
            filtered.map((li, i) => (
              <div key={`${li.section}-${i}`} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr 100px',
                padding: '13px 16px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(200,208,231,0.4)' : 'none',
                background: li.status === 'mismatch' ? 'rgba(239,68,68,0.04)' : 'transparent',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{li.section}</div>
                <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{fmt(li.file1Value)}</div>
                <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{fmt(li.file2Value)}</div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: li.difference !== 0 ? 'var(--danger)' : 'var(--primary)',
                }}>
                  {fmt(li.difference)}
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', width: 'fit-content',
                  padding: '4px 10px', borderRadius: 'var(--r-pill)',
                  fontSize: 11, fontWeight: 700,
                  background: li.status === 'mismatch' ? 'var(--danger-bg)' : 'var(--primary-bg)',
                  color: li.status === 'mismatch' ? 'var(--danger)' : 'var(--primary-dark)',
                }}>
                  {li.status === 'mismatch' ? '⚠ Mismatch' : '✓ Matched'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
