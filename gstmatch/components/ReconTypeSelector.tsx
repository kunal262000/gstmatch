'use client'

// NEW FILE — place at: gstmatch/components/ReconTypeSelector.tsx
//
// Uses the same .neu-raised/.neu-inset styling as the rest of the app
// (matching UploadZone.tsx's visual language). Purely additive — doesn't
// touch any existing component.

import { RECON_TYPES, ReconTypeInfo } from '@/lib/reconTypes'

interface ReconTypeSelectorProps {
  selected: string
  onSelect: (id: string) => void
}

const ICON_BG: Record<string, string> = {
  '📄': '#dbeafe', '🔄': '#d1fae5', '🧾': '#fef3c7', '📋': '#fce7f3',
  '🧮': '#ede9fe', '🔗': '#e0f2fe', '📚': '#dcfce7', '📊': '#fee2e2',
}

function TypeCard({
  type, active, onClick,
}: { type: ReconTypeInfo; active: boolean; onClick: () => void }) {
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

      {type.badge && !active && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--primary-bg)', color: 'var(--primary-dark)',
          fontSize: 9, fontWeight: 700, padding: '2px 8px',
          borderRadius: 'var(--r-pill)', letterSpacing: '0.03em',
        }}>
          {type.badge}
        </div>
      )}

      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: ICON_BG[type.icon] || 'var(--neu-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 12,
      }}>
        {type.icon}
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
        {RECON_TYPES.map(type => (
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
