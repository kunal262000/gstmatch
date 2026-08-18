import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'

export default function RefundsPage() {
  return (
    <>
      <NavBar />
      <main className="page-container" style={{ paddingTop: 32 }}>
        <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
          Refunds &amp; Cancellations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>

        <NeuCard padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Plan access &amp; payments</h2>
              <p>Plan purchases on GSTMatch are one-time payments processed securely through Cashfree in Indian Rupees (INR). Access to the purchased plan features is granted immediately upon successful payment.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Refunds</h2>
              <p>Because plan access to the Service is delivered instantly and is digital in nature, GSTMatch does not offer refunds for completed plan purchases. By completing a payment you agree to this no-refund policy.</p>
              <p style={{ marginTop: 8 }}>
                Exception: if a payment was processed in error (for example, an accidental duplicate charge), please contact us at{' '}
                <a href="mailto:admin@gstmatch.cyou" style={{ color: 'var(--primary-dark)' }}>admin@gstmatch.cyou</a>{' '}
                and we will review your case within 7 business days.
              </p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Cancellations</h2>
              <p>You may stop using the Service at any time. To cancel a recurring arrangement or request account deletion, please email{' '}
                <a href="mailto:admin@gstmatch.cyou" style={{ color: 'var(--primary-dark)' }}>admin@gstmatch.cyou</a>{' '}
                with the subject line &quot;Cancellation&quot;. Future access to paid features will end in line with your request; no pro-rata refunds are provided.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Contact</h2>
              <p>For any refund or cancellation queries, reach us at <a href="mailto:admin@gstmatch.cyou" style={{ color: 'var(--primary-dark)' }}>admin@gstmatch.cyou</a>.</p>
            </section>
          </div>
        </NeuCard>

        <div style={{ marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to home
          </Link>
        </div>
      </main>
    </>
  )
}
