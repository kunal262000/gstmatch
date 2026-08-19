'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import TrustBadges from '@/components/TrustBadges'
import { supabase } from '@/lib/supabase'
import { TIERS, fetchPlanStatus, getPack } from '@/lib/pricing'
import { RECONCILIATION_TYPES } from '@/lib/reconciliation-registry'

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
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

    if (tierId === 'free') {
      router.push('/upload')
      return
    }

    const pack = getPack(tierId)
    if (!pack) {
      setError('Selected plan is unavailable. Please choose another option.')
      return
    }

    setLoadingPlan(tierId)

    try {
      const res = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout order.')
      }

      if (data.paymentSessionId) {
        router.push(`/payment?sessionId=${data.paymentSessionId}&orderId=${data.orderId}`)
      } else {
        throw new Error('Payment session missing. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation error.')
      setLoadingPlan(null)
    }
  }

  const allRecons = Object.values(RECONCILIATION_TYPES)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
      <NavBar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header Title Section */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e0f2fe',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '20px',
              marginBottom: '12px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Simple, Transparent Pricing
          </div>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 900,
              color: '#1e293b',
              marginBottom: '10px',
              letterSpacing: '-0.02em',
            }}
          >
            Powerful GST Reconciliation for <span style={{ color: '#10b981' }}>Every Business</span>
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#64748b',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Choose the plan that fits your needs. Recover lost input tax credit and save hours every month.
          </p>
        </div>

        {/* Monthly / Annual Billing Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              borderRadius: '24px',
              background: '#ffffff',
              border: '1px solid rgba(200,208,231,0.8)',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: 'none',
                background: billingCycle === 'monthly' ? '#10b981' : 'transparent',
                color: billingCycle === 'monthly' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: 'none',
                background: billingCycle === 'annual' ? '#10b981' : 'transparent',
                color: billingCycle === 'annual' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Annual</span>
              <span
                style={{
                  background: billingCycle === 'annual' ? '#ffffff' : '#dcfce7',
                  color: billingCycle === 'annual' ? '#10b981' : '#15803d',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '10px',
                }}
              >
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginBottom: '36px' }}>
          🛡️ Cancel or upgrade anytime. No long-term lock-in.
        </div>

        {error && (
          <div style={{ maxWidth: '600px', margin: '0 auto 24px', padding: '12px 18px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* 5 Pricing Tier Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          {TIERS.map((tier) => {
            const isPopular = tier.popular
            const price = billingCycle === 'annual' && tier.annualAmount
              ? Math.round(tier.annualAmount / 12)
              : tier.amount

            return (
              <div
                key={tier.id}
                style={{
                  borderRadius: '18px',
                  background: 'var(--neu-bg)',
                  boxShadow: isPopular
                    ? '8px 8px 18px var(--neu-dark), -8px -8px 18px var(--neu-light)'
                    : '5px 5px 12px var(--neu-dark), -5px -5px 12px var(--neu-light)',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isPopular ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.7)',
                  position: 'relative',
                }}
              >
                {isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: '12px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
                      {tier.name}
                    </h3>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px' }}>
                      ₹{price}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                        /{tier.periodLabel}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, minHeight: '32px', lineHeight: 1.4 }}>
                      {tier.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={loadingPlan === tier.id}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      background: isPopular
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'var(--neu-bg)',
                      color: isPopular ? '#ffffff' : '#1e293b',
                      fontSize: '13px',
                      fontWeight: 800,
                      border: isPopular ? 'none' : '1px solid rgba(200,208,231,0.8)',
                      boxShadow: isPopular
                        ? '0 4px 12px rgba(16,185,129,0.35)'
                        : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                      cursor: 'pointer',
                      marginBottom: '20px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {loadingPlan === tier.id ? 'Processing...' : tier.id === 'free' ? 'Get Started' : `Choose ${tier.name}`}
                  </button>

                  {/* Feature list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#334155' }}>
                    {tier.features.map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                        <span style={{ lineHeight: 1.4 }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid rgba(200,208,231,0.4)', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                  {tier.id === 'free' ? 'Perfect to explore GSTMatch features' : tier.id === 'growth' ? 'Everything you need to stay GST compliant' : 'Scale your practice. Manage more clients.'}
                </div>
              </div>
            )
          })}
        </div>

        {/* All GST Reconciliations Included Matrix */}
        <div
          style={{
            borderRadius: '20px',
            background: 'var(--neu-bg)',
            boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
            padding: '32px 28px',
            marginBottom: '40px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>
              All GST Reconciliations Included
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Every paid plan includes full access to our entire reconciliation engine suite
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '14px',
            }}
          >
            {allRecons.map((recon) => (
              <div
                key={recon.id}
                style={{
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(200,208,231,0.6)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '20px' }}>
                  {recon.category === 'itc' ? '📄' : recon.category === 'sales' ? '📊' : recon.category === 'returns' ? '📑' : '🏛️'}
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    {recon.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {recon.categoryLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Value Annual Plan Banner */}
        <div
          style={{
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '2px solid #86efac',
            padding: '32px 36px',
            marginBottom: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ display: 'inline-block', background: '#10b981', color: '#ffffff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>
              Best Value
            </div>
            <h3 style={{ fontSize: '26px', fontWeight: 900, color: '#064e3b', margin: '0 0 6px' }}>
              Annual Plan (All Features Included)
            </h3>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#166534', marginBottom: '6px' }}>
              ₹4,999<span style={{ fontSize: '15px', fontWeight: 600 }}>/year</span>
            </div>
            <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>
              Everything in Growth Plan and more — billed annually (That's only ₹417/month).
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#064e3b' }}>
            <div>✓ Unlimited reconciliations*</div>
            <div>✓ Up to 10 GSTIN profiles</div>
            <div>✓ Advanced reports & export</div>
            <div>✓ Priority WhatsApp support</div>
            <div>✓ Compliance score history</div>
          </div>

          <button
            onClick={() => handleCheckout('deluxe')}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              background: '#10b981',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
            }}
          >
            Get Annual Plan →
          </button>
        </div>

        <TrustBadges />
      </main>
    </div>
  )
}
