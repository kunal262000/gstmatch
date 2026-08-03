'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
        setTimeout(() => {
          router.push('/upload')
        }, 1500)
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
        setTimeout(() => {
          router.push('/upload')
        }, 1000)
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
          </NeuCard>
        </div>
      </main>
    </>
  )
}
