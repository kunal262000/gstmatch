'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import { supabase } from '@/lib/supabase'

const PLANS = [
  {
    name: 'Starter',
    price: '₹299',
    rawPrice: 299,
    period: '/month',
    desc: 'Perfect for small traders and retailers.',
    features: [
      '1 GSTIN profile',
      'Up to 500 invoices per month',
      'Excel & PDF report download',
      'Fuzzy matching engine (rapidfuzz)',
      'Email compliance support',
    ],
  },
  {
    name: 'Growth',
    price: '₹699',
    rawPrice: 699,
    period: '/month',
    desc: 'Best for growing MSMEs and distributors.',
    features: [
      'Up to 3 GSTIN profiles',
      'Up to 2000 invoices per month',
      'Excel & PDF report download',
      'Fuzzy matching engine (rapidfuzz)',
      'WhatsApp compliance support',
      'Compliance score history trend',
    ],
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [loadingPlan, setLoadingPlan] = useState<any>(null)
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchUserPlan(u.id)
      }
    })
  }, [])

  const fetchUserPlan = async (userId: string) => {
    try {
      const { data, error: planErr } = await supabase
        .from('users')
        .select('plan')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setCurrentPlan(data.plan)
      }
    } catch (err) {
      console.error('Error fetching user plan:', err)
    }
  }

  const handleCheckout = async (planName: string, amount: number) => {
    setError('')
    setMessage('')

    if (!user) {
      router.push('/auth')
      return
    }

    setLoadingPlan(planName)

    try {
      const response = await fetch('/app/api/cashfree/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
          plan: planName.toLowerCase(),
          amount: amount,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.mock) {
        // Trigger mock payment confirmation call
        const webhookResponse = await fetch('/app/api/cashfree/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mock: true,
            userId: user.id,
            email: user.email,
            plan: planName.toLowerCase(),
          }),
        })

        const webhookData = await webhookResponse.json()
        if (webhookData.success) {
          setMessage(`Payment successful! You have been upgraded to the ${planName} plan.`)
          setCurrentPlan(planName.toLowerCase())
        } else {
          throw new Error('Upgrade update failed.')
        }
      } else {
        // Live Cashfree integration
        const { load } = await import('@cashfreepayments/cashfree-js')
        const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_APP_ID?.startsWith('TEST')
        const cashfree = await load({
          mode: isSandbox ? 'sandbox' : 'production',
        })

        const checkoutOptions = {
          paymentSessionId: data.payment_session_id,
          redirectTarget: '_self',
        }

        cashfree.checkout(checkoutOptions).then((result: any) => {
          if (result.error) {
            setError(result.error.message)
          }
        })
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <>
      <NavBar />

      <main className="page-container">
        {/* Header */}
        <section style={{ textAlign: 'center', padding: '30px 0 20px' }}>
          <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', maxWidth: 460, margin: '0 auto' }}>
            Choose the plan that fits your business needs. Recover lost input tax credit immediately.
          </p>
        </section>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--r-sm)',
            fontSize: 13,
            marginBottom: 20,
            fontWeight: 500,
            textAlign: 'center',
            boxShadow: 'inset 2px 2px 5px rgba(239, 68, 68, 0.1)',
          }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'var(--primary-bg)',
            color: 'var(--primary-dark)',
            padding: '12px 16px',
            borderRadius: 'var(--r-sm)',
            fontSize: 13,
            marginBottom: 20,
            fontWeight: 500,
            textAlign: 'center',
            boxShadow: 'inset 2px 2px 5px rgba(16, 185, 129, 0.1)',
          }}>
            ✦ {message}
          </div>
        )}

        {/* Current Plan Indicator */}
        {user && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--neu-bg)',
              boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-2)'
            }}>
              Your current plan: <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{currentPlan}</span>
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.name.toLowerCase()
            const isPopular = p.name === 'Starter'

            return (
              <NeuCard key={p.name} padding="36px" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                {isPopular && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    right: 28,
                    background: 'var(--primary-bg)',
                    color: 'var(--primary-dark)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 'var(--r-pill)',
                    boxShadow: '2px 2px 6px var(--neu-dark), -2px -2px 6px var(--neu-light)',
                  }}>
                    Popular Choice
                  </div>
                )}

                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20, minHeight: 40 }}>{p.desc}</p>

                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 24 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-1)' }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 4 }}>{p.period}</span>
                </div>

                <div style={{ flexGrow: 1, marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    What&apos;s Included
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {p.features.map((feat) => (
                      <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 'bold' }}>✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <NeuButton
                  variant={isCurrent ? 'ghost' : 'primary'}
                  size="lg"
                  fullWidth
                  disabled={isCurrent || loadingPlan !== null}
                  onClick={() => handleCheckout(p.name, p.rawPrice)}
                >
                  {loadingPlan === p.name ? 'Processing...' : isCurrent ? 'Active Plan' : `Get ${p.name}`}
                </NeuButton>
              </NeuCard>
            )
          })}
        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/upload" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Upload
          </Link>
        </div>
      </main>
    </>
  )
}
