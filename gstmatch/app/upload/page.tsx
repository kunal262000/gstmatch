'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import UploadZone from '@/components/UploadZone'
import NeuButton from '@/components/ui/NeuButton'
import TrustBadges from '@/components/TrustBadges'
import ViewTransitionLink from '@/components/ViewTransitionLink'
import { startReconciliation } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { fetchPlanStatus, FREE_RECON_LIMIT } from '@/lib/pricing'


const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1]

export default function UploadPage() {
  const router = useRouter()

  const [prFile, setPrFile] = useState<File | null>(null)
  const [gstrFile, setGstrFile] = useState<File | null>(null)
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [year, setYear] = useState(String(currentYear))
  const [gstin, setGstin] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [reconCount, setReconCount] = useState(0)
  const [plan, setPlan] = useState('free')
  const [planExpired, setPlanExpired] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/auth')
        return
      }
      setUserId(user.id)
      try {
        const status = await fetchPlanStatus(supabase, user.id)
        setPlan(status.effectivePlan)
        setPlanExpired(status.plan !== 'free' && !status.active)

        if (status.effectivePlan === 'free') {
          const { count } = await supabase
            .from('reconciliation_results')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
          setReconCount(count ?? 0)
        }
      } catch (err) {
        console.error('Error checking usage limit:', err)
      }
    })
  }, [router])

  const limitReached = plan === 'free' && reconCount >= FREE_RECON_LIMIT

  const remainingRuns = Math.max(FREE_RECON_LIMIT - reconCount, 0)

  const isValidGSTIN = (val: string) => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val)
  }

  const canRun = prFile && gstrFile && isValidGSTIN(gstin)

  const handleRun = async () => {
    if (!canRun || !prFile || !gstrFile) return
    setLoading(true)
    setError('')
    try {
      const { jobId } = await startReconciliation(
        prFile, gstrFile, `${month} ${year}`, gstin, businessName, userId
      )
      setReconCount(c => c + 1)

      // Log the reconciliation for the Admin activity dashboard (best-effort).
      if (userId) {
        Promise.resolve().then(() =>
          supabase.from('user_activity').insert({
            user_id: userId,
            email: null,
            action: 'upload',
            detail: { jobId, period: `${month} ${year}`, gstin },
          })
        ).catch((e: any) => console.warn('Failed to log activity:', e))
      }

      router.push(`/results/${jobId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <NavBar />

      <main className="page-container">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-1)' }}>
            New reconciliation
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 5 }}>
            Upload your two files and we&apos;ll match every invoice automatically.
          </p>
        </div>

        {/* Free trial usage banner */}
        {userId && plan === 'free' && !limitReached && !planExpired && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 20, padding: '10px 16px',
            background: remainingRuns === 1 ? 'var(--warning-bg)' : 'var(--primary-bg)',
            color: remainingRuns === 1 ? '#92400e' : 'var(--primary-dark)',
            borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
            boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.03)',
          }}>
            <span>
              🎁 Free trial: {reconCount} of {FREE_RECON_LIMIT} reconciliations used
              {remainingRuns === 1 ? ' — 1 run left' : ''}
            </span>
          </div>
        )}

        {limitReached && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 20, padding: '12px 16px',
            background: 'var(--danger-bg)', color: 'var(--danger)',
            borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
          }}>
            <span>🚫 You&apos;ve reached the free limit of {FREE_RECON_LIMIT} reconciliations.</span>
          </div>
        )}

        {planExpired && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 20, padding: '12px 16px',
            background: 'var(--warning-bg)', color: '#92400e',
            borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
          }}>
            <span>⏳ Your subscription has expired — you&apos;re on the free plan. Renew to restore unlimited reconciliations.</span>
            <ViewTransitionLink href="/pricing" style={{ whiteSpace: 'nowrap', color: '#92400e', fontWeight: 700, textDecoration: 'underline' }}>
              Renew Now →
            </ViewTransitionLink>
          </div>
        )}

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          {[
            { n: '✓', label: 'Account', done: true, active: false },
            { n: '2', label: 'Upload files', done: false, active: true },
            { n: '3', label: 'Results', done: false, active: false },
          ].map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: step.done
                    ? 'var(--primary)'
                    : step.active
                      ? 'var(--primary-bg)'
                      : 'var(--neu-bg)',
                  color: step.done
                    ? 'white'
                    : step.active
                      ? 'var(--primary)'
                      : 'var(--text-3)',
                  boxShadow: step.done
                    ? 'none'
                    : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                  border: step.active ? '1.5px solid var(--primary)' : 'none',
                }}>
                  {step.n}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 500,
                  color: step.active ? 'var(--primary)' : step.done ? 'var(--text-2)' : 'var(--text-3)',
                }}>
                  {step.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: 32, height: 1, background: 'var(--neu-dark)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Period + GSTIN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Period</div>
            <select
              className="neu-input"
              value={month}
              onChange={e => setMonth(e.target.value)}
              aria-label="Select Month"
            >
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Year</div>
            <select
              className="neu-input"
              value={year}
              onChange={e => setYear(e.target.value)}
              aria-label="Select Year"
            >
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>GSTIN</div>
            <input
              className="neu-input"
              placeholder="Enter GSTIN"
              value={gstin}
              onChange={e => setGstin(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Business name</div>
            <input
              className="neu-input"
              placeholder="Your business name"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 16, marginBottom: 20 }}>
          <UploadZone
            label="Purchase Register"
            sublabel="Drop your Excel or CSV file here"
            icon="📊"
            accept=".xlsx,.xls,.csv"
            file={prFile}
            onChange={setPrFile}
          />
          <UploadZone
            label="GSTR-2B File"
            sublabel="Drop Excel or JSON from GST portal"
            icon="🏛️"
            accept=".xlsx,.xls,.json"
            file={gstrFile}
            onChange={setGstrFile}
            hint="GST Portal → Returns → GSTR-2B → Download JSON or Excel"
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--danger-bg)', color: 'var(--danger)',
            padding: '12px 16px', borderRadius: 10, fontSize: 13,
            marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Run button / Upgrade CTA */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          {limitReached ? (
            <>
              <NeuButton variant="primary" size="lg" onClick={() => router.push('/pricing')}>
                ⚡ Upgrade to keep reconciling →
              </NeuButton>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
                Unlock unlimited reconciliations on the Starter or Growth plan.
              </div>
            </>
          ) : (
            <>
              <NeuButton
                variant="primary"
                size="lg"
                disabled={!canRun || loading}
                onClick={handleRun}
              >
                {loading
                  ? '⏳ Processing your files…'
                  : canRun
                    ? '🔍 Run reconciliation →'
                    : 'Upload both files to continue'}
              </NeuButton>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
                Your files are processed securely and never stored permanently
              </div>
              <TrustBadges />
            </>
          )}
        </div>

        {/* Purchase Register format guide */}
        <div className="neu-raised" style={{ marginTop: 28, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                Purchase Register format
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Your Excel/CSV should have columns like these — headers can be in any order, we auto-detect them.
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 680 }}>
              <thead>
                <tr>
                  {['Invoice No', 'Date', 'Supplier Name', 'GSTIN', 'Taxable Value', 'CGST', 'SGST', 'IGST'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 10px', fontSize: 10.5, fontWeight: 700,
                      color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em',
                      borderBottom: '1px solid var(--neu-dark)', background: 'rgba(200,208,231,0.25)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {['INV-0001', '01-Jun-2025', 'Mehta Fabrics Pvt Ltd', '27AABCM1234F1Z5', '100000', '9000', '9000', '0'].map((c, idx) => (
                    <td key={idx} style={{
                      padding: '9px 10px', color: 'var(--text-1)',
                      borderBottom: '1px solid rgba(200,208,231,0.4)',
                      fontFamily: idx === 4 || idx >= 5 ? 'monospace' : 'inherit',
                    }}>{c}</td>
                  ))}
                </tr>
                <tr>
                  {['INV-0002', '03-Jun-2025', 'Rajesh Traders', '24XYZRT5678G2Y6', '55000', '4950', '4950', '0'].map((c, idx) => (
                    <td key={idx} style={{
                      padding: '9px 10px', color: 'var(--text-1)',
                      fontFamily: idx === 4 || idx >= 5 ? 'monospace' : 'inherit',
                    }}>{c}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 12, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span>💡</span>
            <span>
              <strong>Tip:</strong> The columns that matter most are{' '}
              <strong>Invoice No</strong>, <strong>Date</strong>, <strong>Supplier Name</strong>,{' '}
              <strong>GSTIN</strong> and the <strong>Taxable Value / tax amounts</strong>.
              GSTIN must be 15 characters. Rows without an invoice number are skipped.
            </span>
          </div>
        </div>
      </main>
    </>
  )
}
