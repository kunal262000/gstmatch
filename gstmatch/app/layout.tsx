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
      <body className={inter.className} style={{ background: 'var(--neu-mid)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <footer style={{
          borderTop: '1px solid rgba(200,210,230,0.55)',
          background: 'var(--neu-bg)',
          padding: '22px 24px 26px',
        }}>
          <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>GSTMatch</span>
              <nav style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                <a href="/terms" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Terms</a>
                <a href="/privacy" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Privacy</a>
                <a href="/refunds" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Refunds &amp; Cancellations</a>
                <a href="/contact" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Contact Us</a>
              </nav>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              All plan prices are in Indian Rupees (INR). © {new Date().getFullYear()} GSTMatch — GST reconciliation made simple.
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
