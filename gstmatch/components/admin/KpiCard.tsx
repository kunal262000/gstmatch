interface KpiCardProps {
  icon: string
  value: string | number
  label: string
  sub?: string
  color?: 'success' | 'warning' | 'danger' | 'info' | 'default'
  onClick?: () => void
}

const COLOR_MAP = {
  success: 'var(--primary)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  default: 'var(--text-1)',
}

export default function KpiCard({ icon, value, label, sub, color = 'default', onClick }: KpiCardProps) {
  const element = (
    <div
      className="neu-raised"
      onClick={onClick}
      style={{
        padding: '16px 14px',
        background: 'var(--neu-bg)',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: COLOR_MAP[color], lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
  return element
}