interface ExpiryBadgeProps {
  expiresAt: string | null
  paidPlan: boolean
}

const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

export default function ExpiryBadge({ expiresAt, paidPlan }: ExpiryBadgeProps) {
  if (!paidPlan) {
    return <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: 'var(--neu-bg)', color: 'var(--text-3)', boxShadow: 'inset 1px 1px 3px var(--neu-dark), inset -1px -1px 3px var(--neu-light)' }}>Free</span>
  }
  if (!expiresAt) {
    return <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: 'var(--primary-bg)', color: 'var(--primary-dark)' }}>Active</span>
  }
  const d = daysUntil(expiresAt)
  if (d <= 0) {
    return <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger)' }}>Expired</span>
  }
  if (d <= 7) {
    return <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger)' }}>⚠ {d}d left</span>
  }
  if (d <= 30) {
    return <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: 'var(--warning-bg)', color: 'var(--warning)' }}>{d}d left</span>
  }
  return <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 11, fontWeight: 700, background: 'var(--primary-bg)', color: 'var(--primary-dark)' }}>Active</span>
}