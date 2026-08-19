'use client'

import React, { useState, useMemo } from 'react'
import { InvoiceRow, InvoiceCategory } from '@/lib/types'

interface InvoiceTableProps {
  invoices: InvoiceRow[]
  reconType?: string
  file1Name?: string
  file2Name?: string
}

type TabFilter = 'all' | InvoiceCategory

export default function InvoiceTable({
  invoices,
  reconType = 'gstr2b_pr',
  file1Name = 'File 1',
  file2Name = 'File 2',
}: InvoiceTableProps) {
  const [tab, setTab] = useState<TabFilter>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const counts = useMemo(() => {
    return {
      all: invoices.length,
      matched: invoices.filter((i) => i.category === 'matched').length,
      mismatched: invoices.filter((i) => i.category === 'mismatched').length,
      missing_in_gstr2b: invoices.filter((i) => i.category === 'missing_in_gstr2b').length,
      missing_in_pr: invoices.filter((i) => i.category === 'missing_in_pr').length,
    }
  }, [invoices])

  const filtered = useMemo(() => {
    let list = invoices
    if (tab !== 'all') {
      list = list.filter((i) => i.category === tab)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          i.supplierName.toLowerCase().includes(q) ||
          i.invoiceNo.toLowerCase().includes(q) ||
          i.gstin.toLowerCase().includes(q)
      )
    }
    return list
  }, [invoices, tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const isSales = reconType === 'gstr1_sales_register'
  const partyCol = isSales ? 'Customer' : 'Supplier / Party'

  return (
    <div
      style={{
        borderRadius: '16px',
        background: 'var(--neu-bg)',
        boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
        padding: '24px',
        marginBottom: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Detailed Invoice & Record Breakdown
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
            Filterable row-by-row invoice matching across {file1Name} and {file2Name}
          </p>
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search by invoice no, GSTIN, name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(200,208,231,0.8)',
            background: '#ffffff',
            fontSize: '13px',
            outline: 'none',
            minWidth: '240px',
          }}
        />
      </div>

      {/* Tab Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          onClick={() => { setTab('all'); setPage(1) }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'all' ? '#3b82f6' : 'var(--neu-bg)',
            color: tab === 'all' ? '#ffffff' : '#475569',
            boxShadow: tab === 'all' ? '0 2px 8px rgba(59,130,246,0.3)' : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
          }}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => { setTab('matched'); setPage(1) }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'matched' ? '#10b981' : 'var(--neu-bg)',
            color: tab === 'matched' ? '#ffffff' : '#475569',
            boxShadow: tab === 'matched' ? '0 2px 8px rgba(16,185,129,0.3)' : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
          }}
        >
          ✅ Matched ({counts.matched})
        </button>
        <button
          onClick={() => { setTab('mismatched'); setPage(1) }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'mismatched' ? '#f59e0b' : 'var(--neu-bg)',
            color: tab === 'mismatched' ? '#ffffff' : '#475569',
            boxShadow: tab === 'mismatched' ? '0 2px 8px rgba(245,158,11,0.3)' : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
          }}
        >
          ⚠️ Mismatched ({counts.mismatched})
        </button>
        <button
          onClick={() => { setTab('missing_in_gstr2b'); setPage(1) }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'missing_in_gstr2b' ? '#ef4444' : 'var(--neu-bg)',
            color: tab === 'missing_in_gstr2b' ? '#ffffff' : '#475569',
            boxShadow: tab === 'missing_in_gstr2b' ? '0 2px 8px rgba(239,68,68,0.3)' : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
          }}
        >
          ❌ Missing in {file2Name} ({counts.missing_in_gstr2b})
        </button>
        <button
          onClick={() => { setTab('missing_in_pr'); setPage(1) }}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: tab === 'missing_in_pr' ? '#8b5cf6' : 'var(--neu-bg)',
            color: tab === 'missing_in_pr' ? '#ffffff' : '#475569',
            boxShadow: tab === 'missing_in_pr' ? '0 2px 8px rgba(139,92,246,0.3)' : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
          }}
        >
          🔍 Missing in {file1Name} ({counts.missing_in_pr})
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(200,208,231,0.8)', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 12px' }}>{partyCol}</th>
              <th style={{ padding: '10px 12px' }}>Invoice No</th>
              <th style={{ padding: '10px 12px' }}>Date</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>{file1Name} Amount</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>{file2Name} Amount</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Difference</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No matching invoice records found.
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => {
                const isMatched = row.category === 'matched'
                const isMismatch = row.category === 'mismatched'
                const isMissing2 = row.category === 'missing_in_gstr2b'

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(200,208,231,0.4)',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{row.supplierName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{row.gstin}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>
                      {row.invoiceNo}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {row.invoiceDate || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      ₹{row.yourAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {row.gstr2bAmount !== null ? `₹${row.gstr2bAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: (row.difference || 0) > 0 ? '#ef4444' : '#10b981' }}>
                      {(row.difference || 0) > 0 ? `₹${(row.difference || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: isMatched ? '#dcfce7' : isMismatch ? '#fef3c7' : isMissing2 ? '#fee2e2' : '#f3e8ff',
                          color: isMatched ? '#15803d' : isMismatch ? '#b45309' : isMissing2 ? '#b91c1c' : '#6b21a8',
                        }}
                      >
                        {isMatched ? 'Matched' : isMismatch ? 'Mismatch' : isMissing2 ? `Missing in ${file2Name}` : `Missing in ${file1Name}`}
                      </span>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} records
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(200,208,231,0.8)',
                background: '#ffffff',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1,
              }}
            >
              Prev
            </button>
            <span style={{ padding: '4px 8px', fontWeight: 600 }}>{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(200,208,231,0.8)',
                background: '#ffffff',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
