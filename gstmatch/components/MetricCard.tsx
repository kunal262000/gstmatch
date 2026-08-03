interface MetricCardProps {
  icon:    string
  value:   string | number
  label:   string
  color?:  'success' | 'warning' | 'danger' | 'info' | 'default'
}

const COLOR_MAP = {
  success: 'var(--primary)',
  warning: 'var(--warning)',
  danger:  'var(--danger)',
  info:    'var(--info)',
  default: 'var(--text-1)',
}

export default function MetricCard({ icon, value, label, color = 'default' }: MetricCardProps) {
  return (
    <div className="neu-raised" style={{
      padding: '18px 14px', textAlign: 'center', background: 'var(--neu-bg)',
    }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{
        fontSize: 26, fontWeight: 800, color: COLOR_MAP[color], lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', marginTop: 5,
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {label}
      </div>
    </div>
  )
}
