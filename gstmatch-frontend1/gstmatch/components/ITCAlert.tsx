interface ITCAlertProps {
  amount:          number
  supplierCount:   number
  invoiceCount:    number
  onFollowUp?:     () => void
}

export default function ITCAlert({
  amount, supplierCount, invoiceCount, onFollowUp,
}: ITCAlertProps) {
  const formatted = `₹${amount.toLocaleString('en-IN')}`

  return (
    <div className="neu-raised" style={{
      padding: '20px 24px', background: 'var(--neu-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, background: 'var(--danger-bg)',
          borderRadius: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24, flexShrink: 0,
          boxShadow: '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)',
        }}>
          💸
        </div>

        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--danger)', lineHeight: 1 }}>
            {formatted}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
            Tax credit you may lose this month
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {supplierCount} suppliers haven't filed • {invoiceCount} invoices affected
          </div>
        </div>
      </div>

      {onFollowUp && (
        <button
          onClick={onFollowUp}
          className="neu-btn"
          style={{
            background: 'var(--danger-bg)', color: 'var(--danger)',
            padding: '11px 20px', fontSize: 13, fontWeight: 600,
          }}
        >
          Follow up suppliers →
        </button>
      )}
    </div>
  )
}
