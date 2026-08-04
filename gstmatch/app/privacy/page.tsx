import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'

export default function PrivacyPage() {
  return (
    <>
      <NavBar />
      <main className="page-container" style={{ paddingTop: 32 }}>
        <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>

        <NeuCard padding="24px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>1. Information we collect</h2>
              <p>We collect your account details (name, email), the GSTIN and business information you provide, the files you upload for reconciliation, and payment records via Cashfree. We do not store your card details — those are handled entirely by our payment processor.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>2. How we use it</h2>
              <p>We use your data to provide and improve the Service: running reconciliations, generating reports, managing your account and plan, and communicating with you.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>3. Authentication &amp; hosting</h2>
              <p>We use Supabase for user authentication and data storage. Files you upload are processed to generate your report and are not sold or shared with third parties.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>4. Payments</h2>
              <p>Payments are processed by Cashfree under their own privacy policy. We receive from Cashfree only the information needed to activate your plan.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>5. Data security &amp; retention</h2>
              <p>We apply reasonable technical safeguards to protect your data. We retain data only as long as needed to provide the Service or as required by law. You may request deletion by contacting us.</p>
            </section>
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>6. Contact</h2>
              <p>Privacy questions? Email <a href="mailto:support@gstmatch.in" style={{ color: 'var(--primary-dark)' }}>support@gstmatch.in</a>.</p>
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
