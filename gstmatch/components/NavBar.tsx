'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ViewTransitionLink from '@/components/ViewTransitionLink'

const TABS = [
  { label: 'Home', href: '/' },
  { label: 'Upload', href: '/upload' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
]


export default function NavBar() {
  const path = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

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

  const tabs = isAdmin
    ? [...TABS, { label: 'Admin', href: '/admin' }]
    : TABS

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
        display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--r-pill)',
        boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
        background: 'var(--neu-bg)',
      }}>
        {tabs.map(tab => {
          const active = path === tab.href
          return (
            <ViewTransitionLink key={tab.href} href={tab.href} style={{
              padding: '7px 18px', borderRadius: 'var(--r-pill)', fontSize: 13,
              fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s',
              color: active ? 'var(--primary)' : 'var(--text-3)',
              background: 'var(--neu-bg)',
              boxShadow: active
                ? '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)'
                : 'none',
            }}>
              {tab.label}
            </ViewTransitionLink>
          )
        })}
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