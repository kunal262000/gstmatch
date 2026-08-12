import type { Metadata } from 'next'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import Testimonials from '@/components/Testimonials'
import FAQSection from '@/components/FAQSection'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gstmatch.cyou'

export const metadata: Metadata = {
  title: 'GST Reconciliation Software for CAs & Tax Consultants — GSTMatch',
  description: 'Built for Chartered Accountants, Tax Practitioners, and Accounting Firms. Reconcile 50+ client GSTINs with AI fuzzy matching and export CA-ready Excel reports.',
  keywords: [
    'CA GST reconciliation software',
    'tax consultant GSTR-2B software',
    'multi client GST matching',
    'chartered accountant GST tool',
    'GSTR-2B for CAs',
  ],
  alternates: {
    canonical: `${SITE_URL}/for-cas`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/for-cas`,
    title: 'GST Reconciliation Software for CAs & Tax Consultants — GSTMatch',
    description: 'Reconcile multi-client GSTINs with AI fuzzy matching and generate clean Excel reports for your clients.',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: 'GSTMatch for Chartered Accountants' }],
  },
}

export default function ForCasPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'GSTMatch CA Partner Program',
    provider: {
      '@type': 'Organization',
      name: 'GSTMatch',
      url: SITE_URL,
    },
    description: 'Multi-client GSTR-2B reconciliation solution designed for Chartered Accountants, Tax Consultants, and Accounting Firms in India.',
    offers: {
      '@type': 'Offer',
      price: '4999.00',
      priceCurrency: 'INR',
      priceValidUntil: '2027-12-31',
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
            ✦ Designed for CAs, Tax Consultants &amp; Accountants
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
            Reconcile Client GSTINs Effortlessly with{' '}
            <span style={{ color: 'var(--primary)' }}>GSTMatch</span>
          </h1>

          <p
            style={{
              fontSize: 16,
              color: 'var(--text-2)',
              lineHeight: 1.7,
              maxWidth: 580,
              margin: '0 auto 32px',
            }}
          >
            Handle monthly GSTR-2B reconciliations for dozens of clients without spreadsheet chaos. Reduce compliance work from 4 hours to 2 minutes per client.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/pricing"
              className="neu-btn neu-btn-primary"
              style={{ padding: '14px 32px', fontSize: 15, fontWeight: 700 }}
            >
              Get Deluxe CA Plan (₹4,999/yr) →
            </Link>
            <Link
              href="/upload"
              className="neu-btn"
              style={{ padding: '14px 24px', fontSize: 14, color: 'var(--text-2)' }}
            >
              Try 2 Free Client Reconciliations
            </Link>
          </div>
        </section>

        {/* Feature Grid for CAs */}
        <section style={{ margin: '36px 0' }}>
          <div
            className="neu-raised"
            style={{ padding: '36px 28px', background: 'var(--neu-bg)' }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', textAlign: 'center', marginBottom: 24 }}>
              Built to Scale Your Tax Practice
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <div className="neu-flat" style={{ padding: '24px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Multi-GSTIN Management
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Manage multiple client profiles under one account. Switch between client GSTINs with a single click.
                </p>
              </div>

              <div className="neu-flat" style={{ padding: '24px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>📑</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Client-Ready Excel Exports
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Export multi-tab color-coded Excel reports ready to email directly to business owners or present during audit reviews.
                </p>
              </div>

              <div className="neu-flat" style={{ padding: '24px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Fuzzy Typo Pair Algorithm
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  RapidFuzz AI matching solves invoice number prefix mismatches, saving your staff hours of line-by-line manual verification.
                </p>
              </div>

              <div className="neu-flat" style={{ padding: '24px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>💰</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                  Deluxe CA Annual Plan
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                  Annual plan at <strong>₹4,999/year</strong> supporting up to 10 GSTIN profiles with unlimited invoice processing and priority support.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Testimonials />
        <FAQSection />

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link
            href="/upload"
            className="neu-btn neu-btn-primary"
            style={{ padding: '14px 36px', fontSize: 15, fontWeight: 700 }}
          >
            Start Reconciling Client Files Now →
          </Link>
        </div>
      </main>
    </>
  )
}
