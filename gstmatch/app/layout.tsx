import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/neu.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'GSTMatch — GST Reconciliation Made Simple',
  description: 'Upload your Purchase Register and GSTR-2B. See exactly how much tax credit you\'re losing in under 2 minutes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: 'var(--neu-mid)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
