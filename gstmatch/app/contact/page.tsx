import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'

export default function ContactPage() {
  return (
    <>
      <NavBar />
      <main className="page-container" style={{ paddingTop: 32 }}>
        <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
          Contact Us
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>
          We&apos;re here to help. Reach out and we&apos;ll respond within 1 business day.
        </p>

        <NeuCard padding="24px" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>Get in touch</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--text-2)' }}>
            <li><strong>Email:</strong> <a href="mailto:support@gstmatch.in" style={{ color: 'var(--primary-dark)' }}>support@gstmatch.in</a></li>
            <li><strong>Product feedback:</strong> <a href="mailto:feedback@gstmatch.in" style={{ color: 'var(--primary-dark)' }}>feedback@gstmatch.in</a></li>
            <li><strong>Business hours:</strong> Mon–Fri, 10:00 AM – 6:00 PM IST</li>
          </ul>
        </NeuCard>

        <NeuCard padding="24px" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>Registered address</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
            GSTMatch Solutions<br />
            Mumbai, Maharashtra, India
          </p>
        </NeuCard>

        <Link href="/" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to home
        </Link>
      </main>
    </>
  )
}
