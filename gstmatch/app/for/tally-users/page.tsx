import type { Metadata } from 'next'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import HowItWorks from '@/components/HowItWorks'
import FAQSection from '@/components/FAQSection'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gstmatch.cyou'

export const metadata: Metadata = {
  title: 'GSTR-2B Reconciliation for Tally Prime & ERP 9 Users — GSTMatch',
  description: 'Easily reconcile Tally Prime & Tally ERP 9 Purchase Registers with GSTR-2B. AI fuzzy matching pairs invoice typos in 2 minutes. Start with 2 free runs.',
  keywords: [
    'Tally GST reconciliation',
    'Tally Prime GSTR-2B matching',
    'export purchase register Tally',
    'Tally ERP 9 ITC matching',
    'Tally GST software',
  ],
  alternates: {
    canonical: `${SITE_URL}/for/tally-users`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/for/tally-users`,
    title: 'GSTR-2B Reconciliation for Tally Users — GSTMatch',
    description: 'Export Tally purchase register, drag & drop into GSTMatch, and claim 100% eligible ITC in 2 minutes.',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: 'GSTMatch for Tally Users' }],
  },
}

export default function TallyUsersPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GSTMatch for Tally Users',
    operatingSystem: 'Any',
    applicationCategory: 'BusinessApplication',
    description: 'Automated GSTR-2B reconciliation tool built specifically for Tally Prime and Tally ERP 9 users.',
    offers: {
      '@type': 'Offer',
      price: '399.00',
      priceCurrency: 'INR',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <NavBar />

      <main className="page-container" style={{ paddingBottom: 60 }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '36px 0 28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--primary-bg)',
              color: 'var(--primary-dark)',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 16px',
              borderRadius: 'var(--r-pill)',
              marginBottom: 18,
              letterSpacing: '0.03em',
            }}
          >
            ✦ Designed for Tally Prime &amp; ERP 9
          </div>

          <h1
            style={{
              fontSize: 'var(--fs-h1)',
              fontWeight: 800,
              color: 'var(--text-1)',
              lineHeight: 1.25,
              marginBottom: 14,
            }}
          >
            GSTR-2B Reconciliation Made Simple for{' '}
            <span style={{ color: 'var(--primary)' }}>Tally Users</span>
          </h1>

          <p
            style={{
              fontSize: 16,
              color: 'var(--text-2)',
              lineHeight: 1.7,
              maxWidth: 540,
              margin: '0 auto 32px',
            }}
          >
            Tired of complex Tally VLOOKUP formulas failing on invoice prefixes like &ldquo;INV/2025/001&rdquo;? Export your Daybook or Purchase Register from Tally and match it against GSTR-2B in 2 minutes.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/upload"
              className="neu-btn neu-btn-primary"
              style={{ padding: '14px 32px', fontSize: 15, fontWeight: 700 }}
            >
              Reconcile Tally Data Free →
            </Link>
            <Link
              href="/blog/best-gst-reconciliation-tools-for-tally-users"
              className="neu-btn"
              style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-2)' }}
            >
              Read Tally Export Guide
            </Link>
          </div>
        </section>

        {/* Tally Export Guide Box */}
        <section style={{ margin: '36px 0' }}>
          <div
            className="neu-raised"
            style={{
              padding: '32px 28px',
              background: 'var(--neu-bg)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, textAlign: 'center' }}>
              How to Export Purchase Register from Tally in 3 Steps
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
              <div
                className="neu-flat"
                style={{ padding: '20px', borderRadius: 'var(--r-md)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>
                  STEP 1 IN TALLY
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Navigate to GST Reports
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Go to <strong>Gateway of Tally</strong> &gt; <strong>Display More Reports</strong> &gt; <strong>Statutory Reports</strong> &gt; <strong>GST Reports</strong> &gt; <strong>GSTR-2</strong> or <strong>Purchase Register</strong>.
                </p>
              </div>

              <div
                className="neu-flat"
                style={{ padding: '20px', borderRadius: 'var(--r-md)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>
                  STEP 2 IN TALLY
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Export to Excel or CSV
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Press <strong>Alt + E</strong> (Export) &gt; Select <strong>Excel (Spreadsheet)</strong> or <strong>CSV</strong> format. Save the file to your desktop.
                </p>
              </div>

              <div
                className="neu-flat"
                style={{ padding: '20px', borderRadius: 'var(--r-md)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>
                  STEP 3 IN GSTMATCH
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Upload &amp; Match
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Upload the Tally Excel file alongside your portal GSTR-2B into GSTMatch. Our AI engine auto-detects column headers automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Tally Users Love GSTMatch */}
        <section style={{ margin: '48px 0' }}>
          <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-1)', textAlign: 'center', marginBottom: 24 }}>
            Why Tally Users Switch to GSTMatch
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              {
                icon: '⚡',
                title: 'Solves Invoice Typo Differences',
                desc: 'Tally entries often use slashes or hyphens (INV/25/001) while suppliers file 001. GSTMatch fuzzy matching pairs them seamlessly.',
              },
              {
                icon: '📊',
                title: 'CA-Ready Excel Downloads',
                desc: 'Export clean multi-tab Excel workbooks highlighting matched, tax mismatch, and missing in 2B lines ready for your accountant.',
              },
              {
                icon: '🛡️',
                title: 'Zero Tally Data Corruption Risk',
                desc: 'GSTMatch operates on exported files — no ODBC plugins or direct database modifications needed.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="neu-raised"
                style={{ padding: '24px', background: 'var(--neu-bg)' }}
              >
                <div style={{ fontSize: 24, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <HowItWorks />
        <FAQSection />

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link
            href="/upload"
            className="neu-btn neu-btn-primary"
            style={{ padding: '14px 36px', fontSize: 15, fontWeight: 700 }}
          >
            Start Reconciling Tally Files Free →
          </Link>
        </div>
      </main>
    </>
  )
}
