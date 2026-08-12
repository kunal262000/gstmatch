import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gstmatch.cyou'

export const metadata: Metadata = {
  title: 'Upload Purchase Register & GSTR-2B — GSTMatch',
  description: 'Upload your Purchase Register and GSTR-2B Excel or CSV files. Reconcile invoices automatically and detect ITC lost in under 2 minutes.',
  alternates: {
    canonical: `${SITE_URL}/upload`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/upload`,
    title: 'Upload & Reconcile — GSTMatch',
    description: 'Upload Purchase Register and GSTR-2B. Reconcile invoices automatically in 2 minutes.',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: 'GSTMatch Upload' }],
  },
}

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
