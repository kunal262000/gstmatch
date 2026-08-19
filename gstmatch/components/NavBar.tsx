'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ViewTransitionLink from '@/components/ViewTransitionLink'
import { RECONCILIATION_TYPES } from '@/lib/reconciliation-registry'

export default function NavBar() {
  const path = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showReconDropdown, setShowReconDropdown] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetch('/api/admin/me')
          .then((r) => r.json())
          .then((d) => setIsAdmin(Boolean(d.isAdmin)))
          .catch(() => setIsAdmin(false))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) setIsAdmin(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const allRecons = Object.values(RECONCILIATION_TYPES)

  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))

  const tabPillStyle = (href: string): React.CSSProperties => {
    const active = isActive(href)
    return {
      padding: '7px 18px',
      borderRadius: 'var(--r-pill)',
      fontSize: 13,
      fontWeight: 500,
      textDecoration: 'none',
      transition: 'all 0.2s',
      color: active ? 'var(--primary)' : 'var(--text-3)',
      background: 'var(--neu-bg)',
      boxShadow: active
        ? '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)'
        : 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }
  }

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 24px', background: 'var(--neu-bg)',
      borderBottom: '1px solid rgba(200,208,231,0.5)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <ViewTransitionLink href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src="/logo.png"
          alt="GSTMatch logo"
          style={{ height: 40, width: 'auto', objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1 }}>
            <span style={{ color: '#0B1F5E' }}>GST</span>
            <span style={{
              background: 'linear-gradient(120deg, #3F5BFF, #4D6BFF)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}>Match</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginTop: 3 }}>
            Reconcile<span style={{ color: '#22C55E' }}> ·</span> Recover<span style={{ color: '#22C55E' }}> ·</span> Maximize <span>ITC</span>.
          </div>
        </div>
      </ViewTransitionLink>

      {/* Tab pills */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: 4, borderRadius: 'var(--r-pill)',
        boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
        background: 'var(--neu-bg)',
      }}>
        <ViewTransitionLink href="/" style={tabPillStyle('/')}>
          Home
        </ViewTransitionLink>

        <ViewTransitionLink href="/upload" style={tabPillStyle('/upload')}>
          Upload
        </ViewTransitionLink>

        {/* Reconciliation dropdown */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowReconDropdown(true)}
          onMouseLeave={() => setShowReconDropdown(false)}
        >
          <ViewTransitionLink href="/reconciliation" style={tabPillStyle('/reconciliation')}>
            <span>Reconciliation</span>
            <span style={{ fontSize: 10 }}>▾</span>
          </ViewTransitionLink>

          {showReconDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '280px',
                borderRadius: '12px',
                background: '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                padding: '8px',
                zIndex: 100,
                border: '1px solid rgba(200,208,231,0.6)',
              }}
            >
              <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Reconciliation Types
              </div>
              {allRecons.map((recon) => (
                <Link
                  key={recon.id}
                  href={`/upload?type=${recon.id}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    {recon.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {recon.categoryLabel}
                  </div>
                </Link>
              ))}
              <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '4px', paddingTop: '4px' }}>
                <Link
                  href="/reconciliation"
                  style={{
                    display: 'block',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#059669',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  View All Reconciliations →
                </Link>
              </div>
            </div>
          )}
        </div>

        <ViewTransitionLink href="/dashboard" style={tabPillStyle('/dashboard')}>
          Dashboard
        </ViewTransitionLink>

        <ViewTransitionLink href="/reports" style={tabPillStyle('/reports')}>
          Reports
        </ViewTransitionLink>

        <ViewTransitionLink href="/pricing" style={tabPillStyle('/pricing')}>
          Pricing
        </ViewTransitionLink>

        <ViewTransitionLink href="/blog" style={tabPillStyle('/blog')}>
          Blog
        </ViewTransitionLink>

        {isAdmin && (
          <ViewTransitionLink
            href="/admin"
            style={{
              padding: '7px 18px',
              borderRadius: 'var(--r-pill)',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s',
              color: '#d97706',
              background: 'var(--neu-bg)',
              boxShadow: isActive('/admin')
                ? '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)'
                : 'none',
            }}
          >
            Admin
          </ViewTransitionLink>
        )}
      </div>

      {/* Auth state CTA / Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {user ? (
          <>
            <div style={{
              fontSize: 12,
              color: 'var(--text-2)',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 'var(--r-sm)',
              boxShadow: 'inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)',
              background: 'var(--neu-bg)',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }} title={user.email}>
              👤 {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="neu-btn"
              style={{
                padding: '9px 18px',
                fontSize: 13,
                border: 'none',
                background: 'var(--neu-bg)',
                color: 'var(--danger)',
                cursor: 'pointer'
              }}
            >
              Log Out
            </button>
          </>
        ) : (
          <ViewTransitionLink href="/auth" className="neu-btn neu-btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
            Log In →
          </ViewTransitionLink>
        )}
      </div>
    </nav>
  )
}