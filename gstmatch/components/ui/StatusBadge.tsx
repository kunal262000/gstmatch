import { SupplierStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: SupplierStatus
}

const CONFIG: Record<SupplierStatus, { label: string; icon: string; bg: string; color: string }> = {
  filed: {
    label: 'Filed',
    icon:  '✅',
    bg:    'var(--primary-bg)',
    color: 'var(--primary-dark)',
  },
  not_filed: {
    label: 'Not Filed',
    icon:  '❌',
    bg:    'var(--danger-bg)',
    color: 'var(--danger)',
  },
  mismatch: {
    label: 'Mismatch',
    icon:  '⚠️',
    bg:    'var(--warning-bg)',
    color: 'var(--warning)',
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, icon, bg, color } = CONFIG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 'var(--r-pill)',
      fontSize: 11, fontWeight: 700,
      background: bg, color,
    }}>
      {icon} {label}
    </span>
  )
}
