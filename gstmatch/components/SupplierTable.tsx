'use client'

import { useState } from 'react'
import { Supplier, SupplierStatus } from '@/lib/types'
import StatusBadge from './ui/StatusBadge'

interface SupplierTableProps {
  suppliers: Supplier[]
}

type Filter = 'all' | SupplierStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'not_filed', label: 'At risk'   },
  { key: 'mismatch',  label: 'Mismatch'  },
  { key: 'filed',     label: 'Filed'     },
]

export default function SupplierTable({ suppliers }: SupplierTableProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = filter === 'all'
    ? suppliers
    : suppliers.filter(s => s.status === filter)

  return (
    <div>
      {/* Header + filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
          Supplier filing status
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
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
      </div>

      {/* Table */}
      <div className="neu-raised" style={{ overflow: 'hidden', padding: 0 }}>
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2.5fr 1.8fr 1.2fr 1.2fr',
          padding: '10px 18px',
          borderBottom: '1px solid var(--neu-dark)',
        }}>
          {['Supplier Name', 'GSTIN', 'Status', 'Your ITC at Risk'].map(h => (
            <span key={h} style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            No suppliers in this category
          </div>
        ) : (
          filtered.map((s, i) => (
            <div
              key={s.gstin}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1.8fr 1.2fr 1.2fr',
                padding: '13px 18px',
                alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(200,208,231,0.4)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,208,231,0.18)')}
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

              {/* Your ITC at Risk */}
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: s.itcAtRisk > 0 ? 'var(--danger)' : 'var(--text-2)',
              }}>
                ₹{s.itcAtRisk.toLocaleString('en-IN')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
