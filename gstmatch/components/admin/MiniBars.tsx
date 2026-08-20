// Vertical mini bar chart (monthly trend) — CSS-only.
interface MiniBarsProps {
  data: Array<{ label: string; value: number; sub?: string }>
  height?: number
  color?: string
  formatValue?: (v: number) => string
}

export default function MiniBars({ data, height = 120, color = 'var(--primary)', formatValue }: MiniBarsProps) {
  const top = Math.max(1, ...data.map((d) => d.value))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, paddingTop: 8 }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 42,
              borderRadius: '6px 6px 2px 2px',
              height: `${Math.max(6, (d.value / top) * (height - 46))}px`,
              background: color,
              opacity: d.value === 0 ? 0.25 : 1,
              boxShadow: '0 2px 5px rgba(16,185,129,0.25)',
            }}
            title={formatValue ? formatValue(d.value) : String(d.value)}
          />
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{d.label}</div>
          {d.sub !== undefined && (
            <div style={{ fontSize: 9, color: 'var(--text-2)' }}>{formatValue ? formatValue(d.value) : d.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}