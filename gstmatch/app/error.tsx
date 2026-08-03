'use client'

import { useEffect } from 'react'
import NavBar from '@/components/NavBar'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console
    console.error('GSTMatch Runtime Error:', error)
  }, [error])

  return (
    <>
      <NavBar />
      <main className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div className="neu-raised" style={{
          padding: '40px 24px',
          background: 'var(--neu-bg)',
          maxWidth: '500px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
            Something went wrong!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
            An unexpected error occurred while processing the page. This has been logged.
          </p>
          
          <div className="neu-inset" style={{
            padding: '12px 16px',
            background: 'var(--neu-bg)',
            borderRadius: 'var(--r-sm)',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: 12,
            color: 'var(--danger)',
            maxHeight: '120px',
            overflowY: 'auto',
            marginBottom: 28,
            wordBreak: 'break-all',
          }}>
            {error.message || 'Unknown runtime error'}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              className="neu-btn neu-btn-primary"
              style={{ padding: '12px 28px', fontSize: 14, fontWeight: 600 }}
            >
              🔄 Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="neu-btn"
              style={{ padding: '12px 24px', fontSize: 14, color: 'var(--text-2)' }}
            >
              🏠 Go Home
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
