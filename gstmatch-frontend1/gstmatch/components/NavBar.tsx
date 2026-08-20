'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Home',    href: '/'        },
  { label: 'Upload',  href: '/upload'  },
]

export default function NavBar() {
  const path = usePathname()

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 24px', background: 'var(--neu-bg)',
      borderBottom: '1px solid rgba(200,208,231,0.5)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(145deg, #12c98c, #0da876)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '3px 3px 8px #0a9060',
        }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>GSTMatch</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Reconciliation made simple</div>
        </div>
      </Link>

      {/* Tab pills */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--r-pill)',
        boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
        background: 'var(--neu-bg)',
      }}>
        {TABS.map(tab => {
          const active = path === tab.href
          return (
            <Link key={tab.href} href={tab.href} style={{
              padding: '7px 18px', borderRadius: 'var(--r-pill)', fontSize: 13,
              fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s',
              color: active ? 'var(--primary)' : 'var(--text-3)',
              background: 'var(--neu-bg)',
              boxShadow: active
                ? '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)'
                : 'none',
            }}>
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* CTA */}
      <Link href="/upload" className="neu-btn neu-btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
        Start free →
      </Link>
    </nav>
  )
}
