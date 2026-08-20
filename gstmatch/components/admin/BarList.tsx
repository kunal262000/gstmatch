// Horizontal bar list — CSS-only, matches the neumorphic style (no chart deps).
interface BarItem {
  label: string
  value: number
  display?: string
  color?: string // css color
}

interface BarListProps {
  items: BarItem[]
  max?: number
  formatValue?: (v: number) => string
}

export default function BarList({ items, max, formatValue }: BarListProps) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {it.label}
          </div>
          <div style={{ flex: 2, height: 14, borderRadius: 'var(--r-pill)', background: 'var(--neu-bg)', boxShadow: 'inset 2px 2px 4px var(--neu-dark), inset -2px -2px 4px var(--neu-light)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.max(4, (it.value / top) * 100)}%`,
                minWidth: 6,
                borderRadius: 'var(--r-pill)',
                background: it.color || 'var(--primary)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ width: 84, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
            {it.display ?? (formatValue ? formatValue(it.value) : it.value)}
          </div>
        </div>
      ))}
    </div>
  )
}