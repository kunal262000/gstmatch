'use client'

// MODIFIED FILE — replaces: gstmatch/app/upload/page.tsx
//
// Every existing behaviour is UNCHANGED: auth redirect, fetchPlanStatus(),
// the free-trial usage banner, limitReached/planExpired states, GSTIN
// validation, the increment_usage_count RPC call, the user_activity
// logging insert, TrustBadges, the format-guide table.
//
// ONLY CHANGES:
//   1. Added <ReconTypeSelector> above the period/GSTIN row
//   2. file1/file2 replace prFile/gstrFile (generic naming — matches the
//      updated backend route), upload zone labels/hints are now dynamic
//      based on the selected reconciliation type instead of hardcoded
//      "Purchase Register" / "GSTR-2B File"
//   3. The reconCount usage query now sums BOTH
//      reconciliation_results AND summary_reconciliation_results tables —
//      this matches the free-tier fix in storage/job_store.py's
//      count_for_user(). Without this, the free-trial banner in the UI
//      would show a stale/wrong count for users who've run summary-engine
//      reconciliations (GSTR-3B vs GSTR-1, etc).
//   4. startReconciliation() now passes reconType
//   5. The format-guide table at the bottom only renders for invoice-engine
//      types (it describes invoice-level columns, which don't apply to the
//      4 summary-engine types)
//   6. Reads ?type= from the URL so links like /upload?type=gstr2a_vs_gstr2b
//      pre-select the right type — wrapped in <Suspense> since useSearchParams
//      requires it in the Next.js App Router

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavBar from '@/components/NavBar'
import UploadZone from '@/components/UploadZone'
import NeuButton from '@/components/ui/NeuButton'
import TrustBadges from '@/components/TrustBadges'
import ViewTransitionLink from '@/components/ViewTransitionLink'
import ReconTypeSelector from '@/components/ReconTypeSelector'
import { getReconType } from '@/lib/reconTypes'
import { startReconciliation } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { fetchPlanStatus, FREE_RECON_LIMIT } from '@/lib/pricing'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1]

function UploadPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || 'gstr2b_vs_pr'

  const [reconType, setReconType] = useState(initialType)
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [year, setYear] = useState(String(currentYear))
  const [gstin, setGstin] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gstinError, setGstinError] = useState('')
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [reconCount, setReconCount] = useState(0)
  const [plan, setPlan] = useState('free')
  const [planExpired, setPlanExpired] = useState(false)

  const config = getReconType(reconType)

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
          // NEW — count spans BOTH result tables (invoice + summary engine),
          // matching the fix in storage/job_store.py's count_for_user().
          // A free user has FREE_RECON_LIMIT total reconciliations across
          // all 8 reconciliation types combined, not per-type.
          const [{ count: invoiceCount }, { count: summaryCount }] = await Promise.all([
            supabase
              .from('reconciliation_results')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
            supabase
              .from('summary_reconciliation_results')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
          ])
          setReconCount((invoiceCount ?? 0) + (summaryCount ?? 0))
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

  const canRun = file1 && file2 && isValidGSTIN(gstin)

  const handleTypeChange = (id: string) => {
    setReconType(id)
    setFile1(null)
    setFile2(null)
    setError('')
  }

  const handleRun = async () => {
    if (!canRun || !file1 || !file2) return
    setLoading(true)
    setError('')
    try {
      const { jobId } = await startReconciliation(
        file1, file2, `${month} ${year}`, gstin, businessName, userId, reconType
      )
      setReconCount(c => c + 1)

      // Increment usage_count in users table for admin dashboard stats
      // (UNCHANGED)
      if (userId) {
        Promise.resolve().then(() =>
          supabase.rpc('increment_usage_count', { user_id: userId })
        ).catch((e: any) => console.warn('Failed to increment usage count:', e))
      }

      // Log the reconciliation for the Admin activity dashboard (best-effort).
      // UNCHANGED, plus reconType in the detail payload for the admin view.
      if (userId) {
        const { data: { user } } = await supabase.auth.getUser()
        Promise.resolve().then(() =>
          supabase.from('user_activity').insert({
            user_id: userId,
            email: user?.email ?? null,
            action: 'upload',
            detail: { jobId, period: `${month} ${year}`, gstin, reconType },
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
            Choose a reconciliation type, upload your two files, and we&apos;ll match everything automatically.
          </p>
        </div>

        {/* Free trial usage banner — UNCHANGED */}
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

        {/* NEW — Reconciliation type selector */}
        <div style={{ marginBottom: 24 }}>
          <ReconTypeSelector selected={reconType} onSelect={handleTypeChange} />
        </div>

        {/* Period + GSTIN — UNCHANGED */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Period</div>
            <select className="neu-input" value={month} onChange={e => setMonth(e.target.value)} aria-label="Select Month">
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Year</div>
            <select className="neu-input" value={year} onChange={e => setYear(e.target.value)} aria-label="Select Year">
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>GSTIN</div>
            <input
              className="neu-input" placeholder="Enter GSTIN" value={gstin}
              onChange={e => { setGstin(e.target.value); setGstinError('') }}
            />
            {gstin && !isValidGSTIN(gstin) && (
              <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>
                ⚠ Invalid GSTIN format (must be 15 chars, e.g. 27AABCM1234F1Z5)
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Business name</div>
            <input
              className="neu-input" placeholder="Your business name"
              value={businessName} onChange={e => setBusinessName(e.target.value)}
            />
          </div>
        </div>

        {/* Upload zones — labels/hints now dynamic based on reconType */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 16, marginBottom: 20 }}>
          <UploadZone
            label={config.file1Label}
            sublabel={`Drop your ${config.file1Label} here`}
            icon="📊"
            accept=".xlsx,.xls,.csv,.json"
            file={file1}
            onChange={setFile1}
            hint={config.file1Hint}
          />
          <UploadZone
            label={config.file2Label}
            sublabel={`Drop your ${config.file2Label} here`}
            icon="🏛️"
            accept=".xlsx,.xls,.csv,.json"
            file={file2}
            onChange={setFile2}
            hint={config.file2Hint}
          />
        </div>

        {/* Error — UNCHANGED */}
        {error && (
          <div style={{
            background: 'var(--danger-bg)', color: 'var(--danger)',
            padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Run button / Upgrade CTA — UNCHANGED */}
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
              <NeuButton variant="primary" size="lg" disabled={!canRun || loading} onClick={handleRun}>
                {loading ? '⏳ Processing your files…'
               : canRun  ? '🔍 Run reconciliation →'
               :           'Upload both files to continue'}
              </NeuButton>
              {(gstin && !isValidGSTIN(gstin)) && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, fontWeight: 500 }}>
                  ⚠ Please enter a valid 15-character GSTIN
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
                Your files are processed securely and never stored permanently
              </div>
              <TrustBadges />
            </>
          )}
        </div>

        {/* Format guide — only shown for invoice-engine types; the 4
            summary-engine types (GSTR-3B vs GSTR-1 etc.) compare return
            totals, not invoice-level columns, so this table doesn't apply */}
        {config.engine === 'invoice' && (
          <div className="neu-raised" style={{ marginTop: 28, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                  {config.file1Label} format
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
        )}
      </main>
    </>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadPageInner />
    </Suspense>
  )
}
