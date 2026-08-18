'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import TrustBadges from '@/components/TrustBadges'
import ViewTransitionLink from '@/components/ViewTransitionLink'
import { supabase } from '@/lib/supabase'
import {
  TIERS,
  fetchPlanStatus,
  getPack,
} from '@/lib/pricing'

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
      const status = await fetchPlanStatus(supabase, userId)
      setCurrentPlan(status.effectivePlan)
    } catch (err) {
      console.error('Error fetching user plan:', err)
    }
  }

  const handleCheckout = async (tierId: string) => {
    setError('')
    setMessage('')

    if (!user) {
      router.push('/auth')
      return
    }


    const pack = getPack(tierId)
    if (!pack) {
      setError('Selected plan is unavailable. Please choose another option.')
      return
    }

    setLoadingPlan(tierId)

    try {
      const response = await fetch('/api/cashfree/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
          plan: tierId,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.mock) {
        // Trigger mock payment confirmation call
        const webhookResponse = await fetch('/api/cashfree/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mock: true,
            userId: user.id,
            email: user.email,
            plan: tierId,
          }),
        })

        const webhookData = await webhookResponse.json()
        const tierName = TIERS.find((t) => t.id === tierId)?.name ?? tierId
        if (webhookData.success) {
          setMessage(`Payment successful! You have been upgraded to the ${tierName} plan.`)
          fetchUserPlan(user.id)
        } else {
          throw new Error('Upgrade update failed.')
        }
      } else {
        // Live Cashfree integration
        const { load } = await import('@cashfreepayments/cashfree-js')
        const isSandbox = process.env.NEXT_PUBLIC_CASHFREE_MODE === 'sandbox' || process.env.NEXT_PUBLIC_CASHFREE_APP_ID?.startsWith('TEST')
        const cashfree = await load({
          mode: isSandbox ? 'sandbox' : 'production',
        })

        const checkoutOptions = {
          paymentSessionId: data.payment_session_id,
          redirectTarget: '_self',
        }

        cashfree.checkout(checkoutOptions).then((result: any) => {
          if (result.error) {
            setError(result.error.message || 'Unable to open the Cashfree payment window.')
          }
        }).catch((coErr: any) => {
          console.error('Cashfree checkout failed:', coErr)
          setError(coErr?.message || 'Unable to open the Cashfree payment window. Please try again.')
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

        <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginTop: 4 }}>
          💡 You can add or confirm your mobile number on the Cashfree payment page.
        </p>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.id
            const isPopular = tier.id === 'deluxe'

            return (
              <NeuCard key={tier.id} padding="36px" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
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

                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>{tier.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20, minHeight: 40 }}>{tier.desc}</p>

                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-1)' }}>₹{tier.amount.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 4 }}>/{tier.periodLabel}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24 }}>One-time payment</div>

                <div style={{ flexGrow: 1, marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    What&apos;s Included
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tier.features.map((feat) => (
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
                  disabled={loadingPlan !== null}
                  onClick={() => handleCheckout(tier.id)}
                >
                  {loadingPlan === tier.id ? 'Processing...' : isCurrent ? 'Renew / Extend' : `Get ${tier.name}`}
                </NeuButton>
              </NeuCard>
            )
          })}
        </div>

        {/* Trust Signals */}
        <TrustBadges />

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <ViewTransitionLink href="/upload" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Upload
          </ViewTransitionLink>
        </div>
      </main>
    </>
  )
}
