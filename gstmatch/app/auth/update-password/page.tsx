'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // This page is reached via the reset-link redirect. The session (with the
    // recovery token) may still be exchanging, so ensure we have a valid user
    // before offering the form; otherwise bounce to /auth.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/auth')
      }
    })
  }, [router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    setSuccess('Password updated successfully!')
    setTimeout(() => router.push('/dashboard'), 1500)
    setLoading(false)
  }

  return (
    <>
      <NavBar />
      <main className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <NeuCard padding="32px">
            <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 8, textAlign: 'center' }}>
              Set a new password
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginBottom: 24 }}>
              Choose a strong password to restore access to your account.
            </p>

            {error && (
              <div style={{
                background: 'var(--danger-bg)', color: 'var(--danger)',
                padding: '12px 16px', borderRadius: 'var(--r-sm)', fontSize: 13,
                marginBottom: 20, fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{
                background: 'var(--primary-bg)', color: 'var(--primary-dark)',
                padding: '12px 16px', borderRadius: 'var(--r-sm)', fontSize: 13,
                marginBottom: 20, fontWeight: 500,
              }}>
                ✦ {success}
              </div>
            )}

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, paddingLeft: 4 }}>
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="neu-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirm" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, paddingLeft: 4 }}>
                  Confirm New Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="neu-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              <NeuButton type="submit" variant="primary" size="lg" disabled={loading} style={{ marginTop: 12 }}>
                {loading ? 'Please wait...' : 'Update Password'}
              </NeuButton>
            </form>
          </NeuCard>
        </div>
      </main>
    </>
  )
}
