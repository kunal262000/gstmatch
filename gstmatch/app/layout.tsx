import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/neu.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gstmatch-six.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GSTMatch — GST Reconciliation & ITC Recovery Software',
    template: '%s · GSTMatch',
  },
  description: 'Upload your Purchase Register and GSTR-2B. See exactly how much tax credit you are losing in under 2 minutes. 2 free reconciliations included.',
  applicationName: 'GSTMatch',
  keywords: [
    'GST reconciliation software',
    'GSTR-2B matching tool',
    'ITC recovery India',
    'Input tax credit calculator',
    'Purchase register matching',
    'GST compliance MSME',
    'GST match AI',
    'Tally GSTR-2B matching',
    'Zoho Books GST matching',
    'CA GST software',
  ],
  alternates: {
    canonical: SITE_URL,
    types: {
      'application/rss+xml': `${SITE_URL}/feed.xml`,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'GSTMatch',
    url: SITE_URL,
    title: 'GSTMatch — GST Reconciliation & ITC Recovery Software',
    description: 'Upload your Purchase Register and GSTR-2B. Reconcile invoices and recover lost tax credit in 2 minutes.',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: 'GSTMatch GST Reconciliation' }],
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GSTMatch — GST Reconciliation Made Simple',
    description: 'Upload your Purchase Register and GSTR-2B. Reconcile invoices and recover lost tax credit in 2 minutes.',
    images: [`${SITE_URL}/og.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
  },
}

// Global Schema.org JSON-LD structured data
const rootJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'GSTMatch',
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      description: 'AI-powered GST reconciliation software for Indian MSMEs, Accountants, and Chartered Accountants.',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'GSTMatch',
      operatingSystem: 'Any',
      applicationCategory: 'BusinessApplication',
      description: 'Upload Purchase Register and GSTR-2B to automatically reconcile invoices and detect Input Tax Credit at risk in rupees.',
      offers: {
        '@type': 'Offer',
        price: '399.00',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '520',
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="application/rss+xml" title="GSTMatch Blog RSS Feed" href="/feed.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body className={inter.className} style={{ background: 'var(--neu-mid)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <footer style={{
          borderTop: '1px solid rgba(200,210,230,0.55)',
          background: 'var(--neu-bg)',
          padding: '26px 24px 30px',
        }}>
          <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>GSTMatch</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>— GST Reconciliation Made Simple</span>
              </div>
              <nav style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap', fontWeight: 500 }}>
                <a href="/" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Home</a>
                <a href="/pricing" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Pricing</a>
                <a href="/blog" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>Blogs</a>
                <a href="/for-cas" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>For CAs</a>
                <a href="/for/tally-users" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Tally</a>
                <a href="/for/zoho-users" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Zoho Books</a>
                <a href="/terms" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Terms</a>
                <a href="/privacy" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Privacy</a>
                <a href="/refunds" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Refunds</a>
                <a href="/contact" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Contact Us</a>
              </nav>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', borderTop: '1px dashed rgba(200,210,230,0.5)', paddingTop: 12 }}>
              All plan prices are in Indian Rupees (INR). © {new Date().getFullYear()} GSTMatch. All rights reserved. Starter plan at ₹399/mo with 2 free trial reconciliations.
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
