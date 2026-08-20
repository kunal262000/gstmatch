'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import UploadZone from '@/components/UploadZone'
import NeuButton from '@/components/ui/NeuButton'
import { startReconciliation } from '@/lib/api'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const currentYear  = new Date().getFullYear()
const YEARS        = [currentYear, currentYear - 1]

export default function UploadPage() {
  const router = useRouter()

  const [prFile,       setPrFile]       = useState<File | null>(null)
  const [gstrFile,     setGstrFile]     = useState<File | null>(null)
  const [month,        setMonth]        = useState(MONTHS[new Date().getMonth()])
  const [year,         setYear]         = useState(String(currentYear))
  const [gstin,        setGstin]        = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const canRun = prFile && gstrFile && gstin.length === 15

  const handleRun = async () => {
    if (!canRun || !prFile || !gstrFile) return
    setLoading(true)
    setError('')
    try {
      const { jobId } = await startReconciliation(
        prFile, gstrFile, `${month} ${year}`, gstin, businessName
      )
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
            New reconciliation
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 5 }}>
            Upload your two files and we&apos;ll match every invoice automatically.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          {[
            { n: '✓', label: 'Account',     done: true,  active: false },
            { n: '2', label: 'Upload files', done: false, active: true  },
            { n: '3', label: 'Results',      done: false, active: false },
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Period</div>
            <select
              className="neu-input"
              value={month}
              onChange={e => setMonth(e.target.value)}
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
            >
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
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

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 6 }}>Your GSTIN</div>
          <input
            className="neu-input"
            placeholder="27AAAAA0000A1Z5"
            value={gstin}
            maxLength={15}
            onChange={e => setGstin(e.target.value.toUpperCase())}
            style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
          />
          {gstin.length > 0 && gstin.length !== 15 && (
            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>
              GSTIN must be exactly 15 characters
            </div>
          )}
        </div>

        {/* Upload zones */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
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

        {/* Run button */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
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
        </div>
      </main>
    </>
  )
}
