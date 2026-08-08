'use client'

import { useState, useEffect, useRef } from 'react'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // We redirect via a full page navigation (not Next's router) after auth. The
  // Supabase SSR session lives in cookies; a client-side router transition can
  // race those fresh cookies, so middleware (which guards /dashboard) doesn't see
  // the user yet and bounces us back to /auth. A full navigation resends every
  // cookie, letting the middleware allow /dashboard. The ref prevents a double
  // jump when both the sign-in handler and the auth listener try to redirect.
  const didRedirect = useRef(false)
  const goDashboard = () => {
    if (!didRedirect.current) {
      didRedirect.current = true
      window.location.assign('/dashboard')
    }
  }

  useEffect(() => {
    // If a session already exists — e.g. returning from the email-verification link,
    // or already signed in — go straight to the dashboard.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        goDashboard()
      }
    })
    // Also catch the moment the email-confirmation / sign-in completes while on
    // this page (the one-shot getSession above can race the token exchange).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        goDashboard()
      }
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Forgot password ──────────────────────────────
  const [resetMode, setResetMode] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const navigateReset = () => setResetMode(true)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setResetLoading(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    setResetLoading(false)
    if (resetErr) {
      setError(resetErr.message)
    } else {
      // Generic message — don't leak whether the email exists.
      setSuccess('If an account exists, a password reset link has been sent to your email.')
      setResetMode(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      })

      if (signUpErr) {
        setError(signUpErr.message)
      } else if (data.user && data.session) {
        setSuccess('Account created successfully! Redirecting...')
        // Log the signup for the Admin activity dashboard (best-effort).
        const userId = data.user.id
        Promise.resolve().then(() =>
          supabase.from('user_activity').insert({ user_id: userId, email, action: 'signup', detail: {} })
        ).catch((e: any) => console.warn('Failed to log signup:', e))
        setTimeout(() => goDashboard(), 1500)
      } else {
        setSuccess('Verification link sent to email! Please check your inbox.')
      }
    } else {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInErr) {
        setError(signInErr.message)
      } else {
        setSuccess('Logged in successfully! Redirecting...')
        setTimeout(() => goDashboard(), 1000)
      }
    }

    setLoading(false)
  }

  return (
    <>
      <NavBar />

      <main className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <NeuCard padding="32px">
            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: 4,
              padding: 4,
              borderRadius: 'var(--r-pill)',
              boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
              background: 'var(--neu-bg)',
              marginBottom: 28,
            }}>
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 'var(--r-pill)',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: !isSignUp ? 'var(--primary)' : 'var(--text-3)',
                  background: !isSignUp ? 'var(--neu-bg)' : 'transparent',
                  boxShadow: !isSignUp
                    ? '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)'
                    : 'none',
                }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 'var(--r-pill)',
                  fontSize: 14,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: isSignUp ? 'var(--primary)' : 'var(--text-3)',
                  background: isSignUp ? 'var(--neu-bg)' : 'transparent',
                  boxShadow: isSignUp
                    ? '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)'
                    : 'none',
                }}
              >
                Sign Up
              </button>
            </div>

            <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 24, textAlign: 'center' }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>

            {error && (
              <div style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '12px 16px',
                borderRadius: 'var(--r-sm)',
                fontSize: 13,
                marginBottom: 20,
                fontWeight: 500,
                boxShadow: 'inset 2px 2px 5px rgba(239, 68, 68, 0.1)',
              }}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div style={{
                background: 'var(--primary-bg)',
                color: 'var(--primary-dark)',
                padding: '12px 16px',
                borderRadius: 'var(--r-sm)',
                fontSize: 13,
                marginBottom: 20,
                fontWeight: 500,
                boxShadow: 'inset 2px 2px 5px rgba(16, 185, 129, 0.1)',
              }}>
                ✦ {success}
              </div>
            )}

            {resetMode ? (
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginBottom: 4 }}>
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <div>
                  <label htmlFor="resetEmail" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, paddingLeft: 4 }}>
                    Email Address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="neu-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <NeuButton type="submit" variant="primary" size="lg" disabled={resetLoading} style={{ marginTop: 12 }}>
                  {resetLoading ? 'Please wait...' : 'Send Reset Link'}
                </NeuButton>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setError(''); setSuccess('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', fontWeight: 600, padding: 0 }}
                >
                  ← Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Email */}
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, paddingLeft: 4 }}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="neu-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, paddingLeft: 4 }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="neu-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {!isSignUp && (
                  <div style={{ textAlign: 'right', marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => navigateReset()}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--primary-dark)', fontWeight: 600, padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, paddingLeft: 4 }}>
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="neu-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              <NeuButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                style={{ marginTop: 12 }}
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </NeuButton>
              </form>
            )}
          </NeuCard>
        </div>
      </main>
    </>
  )
}
