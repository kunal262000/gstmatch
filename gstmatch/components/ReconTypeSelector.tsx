'use client'

// components/ReconTypeSelector.tsx
//
// FIX: this previously imported from lib/reconTypes.ts, a second,
// disconnected registry using long-form ids ("gstr2b_vs_pr" etc). Every
// other page in the app (homepage, nav, dashboard, pricing, results,
// admin) uses lib/reconciliation-registry.ts with short-form ids
// ("gstr2b_pr" etc). That mismatch meant this selector's cards produced
// ids the Upload page's old getReconType() didn't recognise, crashing the
// page. Now uses the same canonical registry as the rest of the app —
// lib/reconTypes.ts has been removed.
//
// Uses the same .neu-raised/.neu-inset styling as the rest of the app
// (matching UploadZone.tsx's visual language).

import { RECONCILIATION_TYPES, ReconciliationConfig } from '@/lib/reconciliation-registry'

interface ReconTypeSelectorProps {
  selected: string
  onSelect: (id: string) => void
}

// Same category → icon mapping used on the homepage (app/page.tsx) for
// visual consistency between the two places these cards appear.
const CATEGORY_ICON: Record<string, string> = {
  itc: '📄', sales: '📊', returns: '📑', annual: '🏛️',
}
const CATEGORY_ICON_BG: Record<string, string> = {
  itc: '#dbeafe', sales: '#fef3c7', returns: '#ede9fe', annual: '#dcfce7',
}

function TypeCard({
  type, active, onClick,
}: { type: ReconciliationConfig; active: boolean; onClick: () => void }) {
  const icon = CATEGORY_ICON[type.category] || '📄'

  return (
    <div
      onClick={onClick}
      className={active ? 'neu-inset' : 'neu-raised'}
      style={{
        padding: '18px', cursor: 'pointer', position: 'relative',
        background: 'var(--neu-bg)',
        border: active ? '2px solid var(--primary)' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--primary)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
        }}>
          ✓
        </div>
      )}

      {type.popular && !active && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--primary-bg)', color: 'var(--primary-dark)',
          fontSize: 9, fontWeight: 700, padding: '2px 8px',
          borderRadius: 'var(--r-pill)', letterSpacing: '0.03em',
        }}>
          ★ POPULAR
        </div>
      )}

      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: CATEGORY_ICON_BG[type.category] || 'var(--neu-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 12,
      }}>
        {icon}
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
        {type.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
        {type.description}
      </div>

      <div style={{
        marginTop: 10, fontSize: 12, fontWeight: 600,
        color: active ? 'var(--primary)' : 'var(--text-3)',
      }}>
        {active ? '✓ Selected' : 'Select →'}
      </div>
    </div>
  )
}

export default function ReconTypeSelector({ selected, onSelect }: ReconTypeSelectorProps) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>
        Choose reconciliation type
        <span style={{
          marginLeft: 8, fontSize: 10, fontWeight: 700, color: 'var(--primary-dark)',
          background: 'var(--primary-bg)', padding: '2px 8px', borderRadius: 'var(--r-pill)',
        }}>
          NEW
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {Object.values(RECONCILIATION_TYPES).map(type => (
          <TypeCard
            key={type.id}
            type={type}
            active={selected === type.id}
            onClick={() => onSelect(type.id)}
          />
        ))}
      </div>
    </div>
  )
}
