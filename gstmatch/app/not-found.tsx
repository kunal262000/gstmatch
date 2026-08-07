import Link from 'next/link'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          <NeuCard padding="40px" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 72, fontWeight: 800, color: 'var(--primary-dark)', lineHeight: 1, marginBottom: 12,
              textShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
            }}>
              404
            </div>
            <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
              Page not found
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28, lineHeight: 1.6 }}>
              The page you&apos;re looking for doesn&apos;t exist or may have been moved.
              Let&apos;s get you back to something useful.
            </p>
            <Link
              href="/"
              className="neu-btn neu-btn-primary"
              style={{ textDecoration: 'none', display: 'inline-block', padding: '14px 32px', fontSize: 15, fontWeight: 600 }}
            >
              ← Back to Home
            </Link>
          </NeuCard>
        </div>
      </main>
    </>
  )
}
