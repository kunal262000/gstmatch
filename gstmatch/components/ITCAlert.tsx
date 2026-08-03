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
      padding: '28px 24px', background: 'var(--neu-bg)',
      textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Large Amount */}
      <div style={{ fontSize: 'var(--fs-display)', fontWeight: 900, color: 'var(--danger)', marginBottom: 8, letterSpacing: '-0.02em' }}>
        {formatted}
      </div>
      
      {/* Description */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4, marginBottom: 20 }}>
        Tax credit you may lose<br />
        if suppliers don&apos;t file
      </div>

      {/* Details */}
      <div style={{
        display: 'inline-flex', flexDirection: 'column', gap: 6,
        padding: '14px 28px', borderRadius: 'var(--r-sm)',
        boxShadow: 'inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
          Across {supplierCount} suppliers
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
          {invoiceCount} invoices affected
        </div>
      </div>

      {onFollowUp && (
        <button
          onClick={onFollowUp}
          className="neu-btn"
          style={{
            background: 'var(--danger-bg)', color: 'var(--danger)',
            padding: '11px 20px', fontSize: 13, fontWeight: 600,
            marginTop: 18,
          }}
        >
          Follow up suppliers →
        </button>
      )}
    </div>
  )
}
