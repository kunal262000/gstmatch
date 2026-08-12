import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gstmatch.cyou'

export const metadata: Metadata = {
  title: 'Pricing & Plans — GSTMatch',
  description: 'Simple, transparent pricing for GST reconciliation. Starter plan at ₹399/mo, Growth at ₹699/mo, Deluxe at ₹4,999/yr. Start with 2 free reconciliations.',
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/pricing`,
    title: 'Pricing & Plans — GSTMatch',
    description: 'Simple, transparent pricing for GST reconciliation. Starter plan at ₹399/mo with 2 free trial runs.',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: 'GSTMatch Pricing' }],
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
