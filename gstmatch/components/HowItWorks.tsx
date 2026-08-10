'use client'

import Link from 'next/link'

const STEPS = [
  {
    num: '01',
    title: 'Upload Purchase Register & GSTR-2B',
    desc: 'Simply drag and drop your Purchase Register (Excel/CSV from Tally, Busy, Zoho) and GSTR-2B downloaded from the GST portal.',
    icon: '📁',
    tag: 'Step 1 • Instant File Ingestion',
  },
  {
    num: '02',
    title: 'AI Fuzzy Invoice Matching',
    desc: 'Our RapidFuzz engine reconciles invoice numbers, dates, GSTINs, and tax amounts in under 2 minutes, even with minor typos or syntax differences.',
    icon: '⚡',
    tag: 'Step 2 • Intelligent Reconciliation',
  },
  {
    num: '03',
    title: 'Export CA-Ready Report & Recover ITC',
    desc: 'Get an instant breakdown of tax credit lost in rupees, non-compliant supplier lists, and a clean Excel report ready to share with your accountant.',
    icon: '📊',
    tag: 'Step 3 • ITC Protection',
  },
]

export default function HowItWorks() {
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
          ✦ Simple 3-Step Process
        </div>
        <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
          How GSTMatch Works
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto' }}>
          Stop spending hours comparing spreadsheets manually. Claim 100% of your eligible Input Tax Credit in 3 simple steps.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {STEPS.map((step) => (
          <div
            key={step.num}
            className="neu-raised"
            style={{
              padding: '28px 24px',
              background: 'var(--neu-bg)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',

            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 22,
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: 'var(--primary-bg)',
                  }}
                >
                  {step.icon}
                </span>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: 'var(--neu-dark)',
                    opacity: 0.7,
                    fontFamily: 'monospace',
                  }}
                >
                  {step.num}
                </span>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {step.tag}
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                {step.title}
              </h3>

              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 16 }}>
                {step.desc}
              </p>
            </div>

            <div style={{ paddingTop: 12, borderTop: '1px dashed rgba(200,210,230,0.6)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
                ✓ Takes under 60 seconds
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <Link
          href="/upload"
          className="neu-btn neu-btn-primary"
          style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700 }}
        >
          Try 2 Free Reconciliations Now →
        </Link>
      </div>
    </section>
  )
}
