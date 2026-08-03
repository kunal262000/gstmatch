import type { Metadata } from 'next'
import '../styles/neu.css'

export const metadata: Metadata = {
  title: 'GSTMatch — GST Reconciliation Made Simple',
  description: 'Upload your Purchase Register and GSTR-2B. See exactly how much tax credit you\'re losing in under 2 minutes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--neu-bg)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
