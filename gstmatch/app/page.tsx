import Link from 'next/link'
import NavBar from '@/components/NavBar'

const FEATURES = [
  {
    icon:  '🔍',
    bg:    '#dbeafe',
    title: 'GSTR-2B matching',
    desc:  'Upload both files — AI matches every invoice automatically and flags what doesn\'t match.',
  },
  {
    icon:  '💸',
    bg:    '#fee2e2',
    title: 'ITC at risk in rupees',
    desc:  'See exactly how much tax credit you may lose if suppliers don\'t file. Not jargon — just rupees.',
  },
  {
    icon:  '📋',
    bg:    '#d1fae5',
    title: 'Supplier tracker',
    desc:  'Know which suppliers have filed and which haven\'t, so you know who to follow up with.',
  },
  {
    icon:  '📥',
    bg:    '#fef3c7',
    title: 'One-click report',
    desc:  'Download a clean Excel report with mismatches highlighted — ready to send to your CA.',
  },
]

const STATS = [
  { num: '₹1.2L+', label: 'Average ITC recovered per month' },
  { num: '2 min',  label: 'vs 4 hours of manual work'       },
  { num: '30+',    label: 'Mismatch patterns detected'      },
]

export default function LandingPage() {
  return (
    <>
      <NavBar />

      <main className="page-container">
        {/* ── Hero ── */}
        <section style={{ textAlign: 'center', padding: '40px 0 28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--primary-bg)', color: 'var(--primary-dark)',
            fontSize: 12, fontWeight: 700, padding: '5px 16px',
            borderRadius: 'var(--r-pill)', marginBottom: 20, letterSpacing: '0.03em',
          }}>
            ✦ AI-powered reconciliation
          </div>

          <h1 style={{
            fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-1)',
            lineHeight: 1.25, marginBottom: 14,
          }}>
            Stop losing tax credit{' '}
            <span style={{ color: 'var(--primary)' }}>every month</span>
          </h1>

          <p style={{
            fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7,
            maxWidth: 500, margin: '0 auto 32px',
          }}>
            Upload your purchase register and GSTR-2B. See exactly which suppliers
            haven&apos;t filed and how many rupees of tax credit you&apos;re losing —
            in under 2 minutes.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/upload" className="neu-btn neu-btn-primary"
              style={{ padding: '14px 32px', fontSize: 15, fontWeight: 700 }}>
              Start free reconciliation →
            </Link>
            <Link href="/results/demo" className="neu-btn"
              style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-2)' }}>
              View sample report
            </Link>
          </div>
        </section>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, margin: '8px 0 32px' }}>
          {STATS.map(s => (
            <div key={s.label} className="neu-raised" style={{
              padding: '22px 16px', textAlign: 'center', background: 'var(--neu-bg)',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)' }}>{s.num}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Features ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="neu-raised" style={{ padding: '22px', background: 'var(--neu-bg)' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, marginBottom: 14,
                boxShadow: '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)',
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 7 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pricing CTA ── */}
        <div className="neu-raised" style={{
          padding: '32px 28px', textAlign: 'center', background: 'var(--neu-bg)',
        }}>
          <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
            Start free today
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
            1 free reconciliation • No credit card needed • Results in 2 minutes
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { plan: 'Starter', price: '₹299/mo', desc: '1 GSTIN • 500 invoices/month' },
              { plan: 'Growth',  price: '₹699/mo', desc: '3 GSTINs • 2000 invoices/month' },
            ].map(p => (
              <div key={p.plan} className="neu-flat" style={{ padding: '18px 28px', minWidth: 160 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>{p.plan}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{p.price}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{p.desc}</div>
              </div>
            ))}
          </div>

          <Link href="/upload" className="neu-btn neu-btn-primary"
            style={{ padding: '13px 36px', fontSize: 15, fontWeight: 700 }}>
            Try it free →
          </Link>
        </div>
      </main>
    </>
  )
}
