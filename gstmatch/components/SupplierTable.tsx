'use client'

import { useState, useMemo, type CSSProperties } from 'react'
import { Supplier, SupplierStatus } from '@/lib/types'
import StatusBadge from './ui/StatusBadge'

interface SupplierTableProps {
  suppliers: Supplier[]
}

type Filter = 'all' | SupplierStatus
type SortKey = 'name' | 'itc'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'All'      },
  { key: 'not_filed', label: 'At risk'  },
  { key: 'mismatch',  label: 'Mismatch' },
  { key: 'filed',     label: 'Filed'    },
]

const PAGE_SIZE = 8

const HEADER_BTN: CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
  fontFamily: 'inherit', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

export default function SupplierTable({ suppliers }: SupplierTableProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let rows = suppliers

    if (filter !== 'all') {
      rows = rows.filter(s => s.status === filter)
    }

    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.gstin.toLowerCase().includes(q)
      )
    }

    rows = [...rows].sort((a, b) => {
      if (sortKey === 'itc') {
        const d = a.itcAtRisk - b.itcAtRisk
        return sortDir === 'asc' ? d : -d
      }
      const d = a.name.localeCompare(b.name)
      return sortDir === 'asc' ? d : -d
    })

    return rows
  }, [suppliers, filter, query, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'itc' ? 'desc' : 'asc')
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div>
      {/* Header row: title + search */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
          Supplier filing status
        </div>

        <div style={{ position: 'relative', minWidth: 220, flex: '0 1 260px' }}>
          <span style={{ position: 'absolute', left: 12, top: 9, fontSize: 13, color: 'var(--text-3)' }}>🔍</span>
          <input
            className="neu-input"
            placeholder="Search supplier or GSTIN…"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            style={{ paddingLeft: 34, fontSize: 13, paddingTop: 9, paddingBottom: 9 }}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1) }}
            className="neu-btn"
            style={{
              padding: '5px 14px', fontSize: 12, fontWeight: 500,
              color: filter === f.key ? 'var(--primary)' : 'var(--text-3)',
              boxShadow: filter === f.key
                ? 'inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)'
                : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
              borderRadius: 'var(--r-pill)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="neu-raised" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {/* Sticky column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.6fr 1fr 1.3fr',
            padding: '10px 18px',
            borderBottom: '1px solid var(--neu-dark)',
            position: 'sticky', top: 0, zIndex: 2,
            background: 'var(--neu-bg)',
          }}>
            <button style={HEADER_BTN} onClick={() => toggleSort('name')}>
              Supplier Name{arrow('name')}
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              GSTIN
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </span>
            <button style={{ ...HEADER_BTN, justifyContent: 'flex-end' }} onClick={() => toggleSort('itc')}>
              ITC at Risk{arrow('itc')}
            </button>
          </div>

          {pageRows.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              No suppliers match your filters
            </div>
          ) : (
            pageRows.map((s, i) => (
              <div
                key={s.gstin}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.6fr 1fr 1.3fr',
                  padding: '13px 18px',
                  alignItems: 'center',
                  borderBottom: i < pageRows.length - 1 ? '1px solid rgba(200,210,230,0.4)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(238,241,246,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Supplier Name */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                  {s.name}
                </div>

                {/* GSTIN */}
                <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
                  {s.gstin}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={s.status} />
                </div>

                {/* ITC at Risk */}
                <div style={{
                  fontSize: 13, fontWeight: 700, textAlign: 'right',
                  color: s.itcAtRisk > 0 ? 'var(--danger)' : 'var(--text-2)',
                }}>
                  ₹{s.itcAtRisk.toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="neu-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              ‹ Prev
            </button>
            <button
              className="neu-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
