import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'

export default function TermsPage() {
  return (
    <>
      <NavBar />
      <main className="page-container" style={{ paddingTop: 32 }}>
        <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
          Terms &amp; Conditions
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>

        <NeuCard padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>1. Acceptance of terms</h2>
              <p>By accessing or using GSTMatch (&quot;the Service&quot;), you agree to be bound by these Terms &amp; Conditions and our Privacy Policy. If you do not agree, please do not use the Service.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>2. The Service</h2>
              <p>GSTMatch helps businesses reconcile their Purchase Register against GSTR-2B to identify mismatches and potential Input Tax Credit (ITC) losses. We provide the reconciliation engine and downloadable reports; we do not provide tax, legal, or accounting advice.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>3. Accounts &amp; usage</h2>
              <p>You are responsible for safeguarding your account credentials and for all activity under your account. You agree to provide accurate information and not misuse the Service. Free and paid plans are subject to the usage limits described on our Pricing page.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>4. Payments</h2>
              <p>Paid plans are billed in Indian Rupees (INR) via Cashfree. Payment terms are as displayed at checkout. You are responsible for any applicable taxes.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>5. Acceptable use</h2>
              <p>You agree not to upload unlawful content, attempt to disrupt the Service, or use the Service to violate any law. You retain ownership of your own data; we process it only to deliver the Service.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>6. No warranty &amp; limitation of liability</h2>
              <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages, or for any tax-related decisions you make based on the reports.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>7. Changes to these terms</h2>
              <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>8. Contact</h2>
              <p>Questions about these terms? Contact us at <a href="mailto:support@gstmatch.in" style={{ color: 'var(--primary-dark)' }}>support@gstmatch.in</a>.</p>
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
