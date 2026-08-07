import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'

async function verifyOrder(orderId: string): Promise<{
  status: string
  amount: number | null
  plan: string | null
  mock: boolean
  error?: string
}> {
  // The status endpoint is a Next route on the SAME app, so resolve this app's
  // own origin from the deployment URL (works in dev and on Vercel).
  const base =
    typeof process.env.VERCEL_URL === 'string'
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

  try {
    const res = await fetch(`${base}/api/cashfree/status?order_id=${encodeURIComponent(orderId)}`, {
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) {
      return { status: 'UNKNOWN', amount: null, plan: null, mock: false, error: data.error }
    }
    return {
      status: data.status ?? 'UNKNOWN',
      amount: data.amount ?? null,
      plan: data.plan ?? null,
      mock: Boolean(data.mock),
    }
  } catch (err: any) {
    return { status: 'UNKNOWN', amount: null, plan: null, mock: false, error: err.message }
  }
}


export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: { order_id?: string; payment_status?: string }
}) {
  const orderId = searchParams.order_id || ''
  const result = await verifyOrder(orderId)

  const isSuccess =
    result.status === 'PAID' || (!result.mock && searchParams.payment_status === 'SUCCESS')

  return (
    <>
      <NavBar />
      <main className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <NeuCard padding="40px" style={{ textAlign: 'center' }}>
            {isSuccess ? (
              <>
                <div style={{
                  width: 84, height: 84, margin: '0 auto 20px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, color: '#1a7f4b',
                  background: 'var(--neu-bg)',
                  boxShadow: '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)',
                }}>
                  ✓
                </div>
                <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
                  Payment Successful
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 28 }}>
                  {result.plan ? (
                    <>You&apos;re all set! Your <strong style={{ color: 'var(--text-1)' }}>{result.plan}</strong> plan is now active.</>
                  ) : (
                    <>Your plan upgrade is now active. You can start reconciling your GST data.</>
                  )}
                </p>

                <div style={{
                  background: 'var(--neu-mid)', border: '1px solid rgba(200,210,230,0.55)',
                  borderRadius: 'var(--r-sm)', padding: '16px 20px', marginBottom: 28, textAlign: 'left',
                }}>
                  {result.amount != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-3)' }}>Amount paid</span>
                      <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>₹{result.amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {orderId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-3)' }}>Order ID</span>
                      <span style={{ color: 'var(--text-2)', fontWeight: 600, wordBreak: 'break-all', textAlign: 'right' }}>{orderId}</span>
                    </div>
                  )}
                </div>

                <Link href="/upload" style={{ textDecoration: 'none' }}>
                  <span className="neu-btn neu-btn-primary" style={{ display: 'inline-block', padding: '14px 32px', fontSize: 15, fontWeight: 600 }}>
                    Start Uploading →
                  </span>
                </Link>
              </>
            ) : result.status === 'PENDING' ? (


              <>
                <div style={{
                  width: 84, height: 84, margin: '0 auto 20px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: 'var(--primary-dark)',
                  background: 'var(--neu-bg)',
                  boxShadow: '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)',
                }}>
                  …
                </div>
                <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
                  Confirming your payment
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 28 }}>
                  Your payment is being processed. This usually takes a few seconds. You can check your
                  account shortly to see if it went through.
                </p>
                <Link href="/pricing" style={{ textDecoration: 'none' }}>
                  <span className="neu-btn neu-btn-primary" style={{ display: 'inline-block', padding: '14px 32px', fontSize: 15, fontWeight: 600 }}>
                    Go to Pricing
                  </span>
                </Link>
              </>
            ) : (
              <>
                <div style={{
                  width: 84, height: 84, margin: '0 auto 20px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, color: 'var(--danger)',
                  background: 'var(--neu-bg)',
                  boxShadow: '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)',
                }}>
                  ✗
                </div>
                <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
                  Payment not completed
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 28 }}>
                  We couldn&apos;t confirm your payment. If money was deducted, it will be auto-refunded
                  within a few days. You can try again below.
                </p>
                {result.error && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24, wordBreak: 'break-word' }}>
                    {result.error}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/pricing" style={{ textDecoration: 'none' }}>
                    <span className="neu-btn neu-btn-primary" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 15, fontWeight: 600 }}>
                      Try Again
                    </span>
                  </Link>
                  <Link href="/upload" style={{ textDecoration: 'none' }}>
                    <span className="neu-btn" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 15, fontWeight: 600, color: 'var(--text-2)' }}>
                      Go to Upload
                    </span>
                  </Link>
                </div>
              </>
            )}
          </NeuCard>
        </div>
      </main>
    </>
  )
}
