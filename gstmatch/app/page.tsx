import Link from 'next/link'
import NavBar from '@/components/NavBar'
import Testimonials from '@/components/Testimonials'
import FAQSection from '@/components/FAQSection'
import TrustBadges from '@/components/TrustBadges'
import { FAQS } from '@/lib/faqs'
import { RECONCILIATION_TYPES } from '@/lib/reconciliation-registry'

const STATS = [
  { num: '₹1.2L+', label: 'Average ITC recovered per month' },
  { num: '2 min', label: 'vs 4 hours of manual work' },
  { num: '30+', label: 'Mismatch patterns detected' },
]

export default function LandingPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  }

  const allRecons = Object.values(RECONCILIATION_TYPES)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <NavBar />

      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* ── Hero ── */}
        <section style={{ textAlign: 'center', padding: '40px 0 32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e0f2fe',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: 800,
              padding: '5px 16px',
              borderRadius: '20px',
              marginBottom: '20px',
              letterSpacing: '0.03em',
            }}
          >
            ✦ AI-powered GST Reconciliation
          </div>

          <h1
            style={{
              fontSize: '44px',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.2,
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            Stop losing tax credit <span style={{ color: '#10b981' }}>every month</span>
          </h1>

          <p
            style={{
              fontSize: '17px',
              color: '#64748b',
              lineHeight: 1.6,
              maxWidth: '620px',
              margin: '0 auto 32px',
            }}
          >
            Compare GST data, find mismatches, recover ITC and file with confidence.
            All file-based. <strong>No government portal password required.</strong>
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
            <Link
              href="/upload"
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              }}
            >
              Start free reconciliation →
            </Link>

            <Link
              href="/results/demo"
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                background: 'var(--neu-bg)',
                color: '#334155',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '3px 3px 7px var(--neu-dark), -3px -3px 7px var(--neu-light)',
                border: '1px solid rgba(200,208,231,0.6)',
              }}
            >
              View sample report
            </Link>
          </div>

          {/* 3 Metric Pills */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              maxWidth: '820px',
              margin: '0 auto',
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={i}
                style={{
                  borderRadius: '14px',
                  background: 'var(--neu-bg)',
                  boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)',
                  padding: '20px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}>
                  {s.num}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── GST Reconciliation Suite Grid ── */}
        <section style={{ margin: '48px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
              ✦ NEW
            </div>
            <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              GST Reconciliation Suite
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              Reconcile all your GST data in minutes. Upload two files and get accurate results.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {allRecons.map((recon) => (
              <div
                key={recon.id}
                style={{
                  borderRadius: '16px',
                  background: 'var(--neu-bg)',
                  boxShadow: '5px 5px 12px var(--neu-dark), -5px -5px 12px var(--neu-light)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: recon.popular ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px' }}>
                      {recon.category === 'itc' ? '📄' : recon.category === 'sales' ? '📊' : recon.category === 'returns' ? '📑' : '🏛️'}
                    </span>
                    {recon.popular && (
                      <span style={{ background: '#10b981', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                        ★ POPULAR
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                    {recon.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px', minHeight: '40px' }}>
                    {recon.description}
                  </p>
                </div>

                <Link
                  href={`/upload?type=${recon.id}`}
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#059669',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Reconcile now</span>
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works (3 Steps) ── */}
        <section style={{ margin: '64px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
              ✦ Simple 3-Step Process
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              How GSTMatch Works
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Stop spending hours comparing spreadsheets manually. Claim 100% of your eligible ITC in 3 simple steps.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              { step: '01', title: 'Upload Any Two Files', desc: 'Upload the two files you want to reconcile from the GST portal or your accounting system.', icon: '📁', time: 'Takes under 60 seconds' },
              { step: '02', title: 'AI Matches & Finds Mismatches', desc: 'Our engine matches invoices, identifies mismatches, missing data, duplicates, and tax differences.', icon: '⚡', time: 'Takes under 60 seconds' },
              { step: '03', title: 'Export Report & Recover ITC', desc: 'Download CA-ready Excel and PDF reports to take action and claim your full tax credit.', icon: '📊', time: 'Takes under 60 seconds' },
            ].map((st, i) => (
              <div
                key={i}
                style={{
                  borderRadius: '16px',
                  background: 'var(--neu-bg)',
                  boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                  padding: '24px',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#cbd5e1', position: 'absolute', top: '18px', right: '20px' }}>
                  {st.step}
                </div>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>{st.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Step {i + 1}
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                  {st.title}
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '14px' }}>
                  {st.desc}
                </p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>
                  ✓ {st.time}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── All Reconciliations. One Dashboard. Preview ── */}
        <section
          style={{
            borderRadius: '20px',
            background: 'var(--neu-bg)',
            boxShadow: '8px 8px 20px var(--neu-dark), -8px -8px 20px var(--neu-light)',
            padding: '36px',
            margin: '64px 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '30px', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>
              All Reconciliations.<br />One Dashboard.
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
              Track all your reconciliations, view ITC at risk, recovery metrics, and filing history in one place.
            </p>
            <Link
              href="/dashboard"
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
              }}
            >
              Go to Dashboard →
            </Link>
          </div>

          <div
            style={{
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid rgba(200,208,231,0.8)',
              padding: '20px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>ITC Recovered</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>₹1,24,580</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>ITC at Risk</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>₹28,450</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Mismatches</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>48</div>
              </div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Recent Reconciliations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600 }}>GSTR-2B vs PR</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>₹42,560</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600 }}>GSTR-1 vs Sales</span>
                <span style={{ color: '#0284c7', fontWeight: 700 }}>₹18,230</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600 }}>GSTR-3B vs GSTR-1</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>₹0 Diff</span>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <Testimonials />

        {/* FAQ Section */}
        <FAQSection />

        {/* Trust Badges */}
        <div style={{ marginTop: '48px' }}>
          <TrustBadges />
        </div>
      </main>
    </>
  )
}
