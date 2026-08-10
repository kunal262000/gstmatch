'use client'

const TESTIMONIALS = [
  {
    quote: 'We discovered ₹1.82 Lakhs of unclaimed tax credit in our very first GSTR-2B run. Suppliers had filed under slightly different invoice numbers, which our Excel formulas always missed!',
    name: 'CA Rajesh Kumar',
    role: 'Managing Partner, Kumar & Associates',
    location: 'Mumbai, Maharashtra',
    savings: '₹1.82L ITC Recovered',
    verified: true,
  },
  {
    quote: 'Reconciling 1,400 monthly invoices used to consume 2 full days for my accounting team. GSTMatch completes it in 90 seconds flat. The CA-ready export alone pays for itself 10x over.',
    name: 'Sunita Sharma',
    role: 'Head of Finance, Apex Logistics Pvt Ltd',
    location: 'New Delhi',
    savings: '40+ Hours Saved / Month',
    verified: true,
  },
  {
    quote: 'As a steel distributor with over 40 active suppliers, holding non-compliant supplier payments based on GSTMatch supplier mismatch reports has drastically improved our cash flow.',
    name: 'Vikram Patel',
    role: 'Director, Patel Steel Traders',
    location: 'Ahmedabad, Gujarat',
    savings: 'Zero Penalties in FY 25-26',
    verified: true,
  },
]

export default function Testimonials() {
  return (
    <section style={{ margin: '48px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--primary-bg)',
            color: 'var(--primary-dark)',
            fontSize: 12,
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: 'var(--r-pill)',
            marginBottom: 10,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          ✦ Trusted by 500+ Indian Businesses & CAs
        </div>
        <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
          Proven Results & Recovery Stories
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto' }}>
          See how Indian finance teams and tax professionals use GSTMatch to protect input tax credits and save compliance hours.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="neu-raised"
            style={{
              padding: '26px 24px',
              background: 'var(--neu-bg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',

            }}
          >
            <div>
              {/* Rating & Verified Tag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ color: '#f59e0b', fontSize: 14 }}>★★★★★</div>
                {t.verified && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--primary-dark)',
                      background: 'var(--primary-bg)',
                      padding: '3px 10px',
                      borderRadius: 'var(--r-pill)',
                    }}
                  >
                    ✓ Verified Customer
                  </span>
                )}
              </div>

              {/* Quote */}
              <p
                style={{
                  fontSize: 13.5,
                  color: 'var(--text-1)',
                  lineHeight: 1.65,
                  fontStyle: 'italic',
                  marginBottom: 20,
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>

            {/* User profile info */}
            <div style={{ borderTop: '1px dashed rgba(200,210,230,0.6)', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {t.role} • {t.location}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--primary-dark)',
                  background: 'var(--neu-bg)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  display: 'inline-block',
                  boxShadow: 'inset 2px 2px 4px var(--neu-dark), inset -2px -2px 4px var(--neu-light)',
                }}
              >
                🎯 Result: {t.savings}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
