import type { Metadata } from 'next'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import HowItWorks from '@/components/HowItWorks'
import FAQSection from '@/components/FAQSection'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gstmatch.cyou'

export const metadata: Metadata = {
  title: 'Zoho Books GSTR-2B Reconciliation Software — GSTMatch',
  description: 'Reconcile Zoho Books Purchase Register with GSTR-2B in 2 minutes. Auto-parses Zoho CSV/Excel files and claims 100% eligible ITC.',
  keywords: [
    'Zoho Books GST reconciliation',
    'Zoho Books GSTR-2B matching',
    'export purchase register Zoho',
    'Zoho Books ITC claim',
    'Zoho GST software',
  ],
  alternates: {
    canonical: `${SITE_URL}/for/zoho-users`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/for/zoho-users`,
    title: 'Zoho Books GSTR-2B Reconciliation — GSTMatch',
    description: 'Reconcile Zoho Books Purchase Register with GSTR-2B in 2 minutes with AI fuzzy matching.',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: 'GSTMatch for Zoho Books Users' }],
  },
}

export default function ZohoUsersPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GSTMatch for Zoho Books',
    operatingSystem: 'Any',
    applicationCategory: 'BusinessApplication',
    description: 'GSTR-2B reconciliation software designed specifically for Zoho Books purchase register exports.',
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
            ✦ Built for Zoho Books Integration
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
            Reconcile Zoho Books Purchases with{' '}
            <span style={{ color: 'var(--primary)' }}>GSTR-2B</span>
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
            Export your Bills and Purchase History from Zoho Books in CSV or Excel format. GSTMatch automatically parses multi-tax rate columns and pairs mismatched invoice numbers in under 2 minutes.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/upload"
              className="neu-btn neu-btn-primary"
              style={{ padding: '14px 32px', fontSize: 15, fontWeight: 700 }}
            >
              Reconcile Zoho Books Data Free →
            </Link>
            <Link
              href="/pricing"
              className="neu-btn"
              style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-2)' }}
            >
              View Pricing Plans
            </Link>
          </div>
        </section>

        {/* Zoho Export Instructions */}
        <section style={{ margin: '36px 0' }}>
          <div
            className="neu-raised"
            style={{
              padding: '32px 28px',
              background: 'var(--neu-bg)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, textAlign: 'center' }}>
              How to Export Bills from Zoho Books
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
              <div
                className="neu-flat"
                style={{ padding: '20px', borderRadius: 'var(--r-md)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>
                  STEP 1 IN ZOHO
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Open Purchases Menu
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Log into <strong>Zoho Books</strong> &gt; Click <strong>Purchases</strong> on the left sidebar &gt; Select <strong>Bills</strong> or <strong>Purchase History</strong>.
                </p>
              </div>

              <div
                className="neu-flat"
                style={{ padding: '20px', borderRadius: 'var(--r-md)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>
                  STEP 2 IN ZOHO
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Export CSV / Excel File
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Click the Hamburger Menu (three lines) or <strong>Export Bills</strong> button at top-right &gt; Choose <strong>CSV</strong> or <strong>XLSX</strong>.
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
                  Instant AI Matching
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Drag &amp; drop the exported Zoho file into GSTMatch. Our intelligent engine maps vendor GSTINs, bill dates, and tax columns automatically.
                </p>
              </div>
            </div>
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
            Start Reconciling Zoho Files Free →
          </Link>
        </div>
      </main>
    </>
  )
}
