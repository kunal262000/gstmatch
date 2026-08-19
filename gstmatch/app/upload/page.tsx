'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import UploadZone from '@/components/UploadZone'
import NeuButton from '@/components/ui/NeuButton'
import TrustBadges from '@/components/TrustBadges'
import { startReconciliation } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { fetchPlanStatus, FREE_RECON_LIMIT } from '@/lib/pricing'
import {
  RECONCILIATION_TYPES,
  ReconciliationTypeId,
  getReconciliationConfig,
} from '@/lib/reconciliation-registry'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear - 2]

function UploadContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = (searchParams.get('type') as ReconciliationTypeId) || 'gstr2b_pr'

  const [selectedType, setSelectedType] = useState<ReconciliationTypeId>(initialType)
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [file1Validation, setFile1Validation] = useState<string>('')
  const [file2Validation, setFile2Validation] = useState<string>('')

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
  const [currentStep, setCurrentStep] = useState<number>(2)

  const config = getReconciliationConfig(selectedType)

  useEffect(() => {
    const qType = searchParams.get('type') as ReconciliationTypeId
    if (qType && qType in RECONCILIATION_TYPES) {
      setSelectedType(qType)
    }
  }, [searchParams])

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

  const handleGSTINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15)
    setGstin(val)
    if (val.length === 15) {
      setGstinError(isValidGSTIN(val) ? '' : 'Invalid GSTIN format (e.g., 27AABCU9603R1ZM)')
    } else if (val.length > 0) {
      setGstinError(`${15 - val.length} more characters needed`)
    } else {
      setGstinError('')
    }
  }

  // Pre-validate uploaded files against config keywords
  const handleFile1Select = (file: File | null) => {
    setFile1(file)
    if (file) {
      const name = file.name.toLowerCase()
      const ext = name.substring(name.lastIndexOf('.'))
      if (!config.file1.allowedExtensions.includes(ext)) {
        setFile1Validation(`⚠️ Unexpected file format ${ext}. Expected ${config.file1.allowedExtensions.join(', ')}`)
      } else {
        setFile1Validation(`✓ ${config.file1.shortName} file verified (${(file.size / 1024).toFixed(1)} KB)`)
      }
    } else {
      setFile1Validation('')
    }
  }

  const handleFile2Select = (file: File | null) => {
    setFile2(file)
    if (file) {
      const name = file.name.toLowerCase()
      const ext = name.substring(name.lastIndexOf('.'))
      if (!config.file2.allowedExtensions.includes(ext)) {
        setFile2Validation(`⚠️ Unexpected file format ${ext}. Expected ${config.file2.allowedExtensions.join(', ')}`)
      } else {
        setFile2Validation(`✓ ${config.file2.shortName} file verified (${(file.size / 1024).toFixed(1)} KB)`)
      }
    } else {
      setFile2Validation('')
    }
  }

  const handleSubmit = async () => {
    if (limitReached) {
      setError('Free reconciliation limit reached. Please upgrade to continue.')
      return
    }
    if (!file1 || !file2) {
      setError(`Please upload both ${config.file1.shortName} and ${config.file2.shortName}.`)
      return
    }
    if (gstin && !isValidGSTIN(gstin)) {
      setGstinError('Please enter a valid 15-character GSTIN')
      return
    }

    setLoading(true)
    setError('')

    try {
      const periodStr = `${month} ${year}`
      const effectiveGSTIN = gstin || '27AABCU9603R1ZM'
      const effectiveBiz = businessName || 'My Business'

      const res = await startReconciliation(
        file1,
        file2,
        periodStr,
        effectiveGSTIN,
        effectiveBiz,
        selectedType,
        userId
      )

      router.push(`/results/${res.jobId}`)
    } catch (err: any) {
      setError(err.message || 'Reconciliation failed. Please verify your file contents.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
      <NavBar />

      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Title Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
            New Reconciliation
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Upload your two files and we'll match data instantly across GST returns and your books.
          </p>
        </div>

        {/* 3-Step Stepper Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '14px 20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(200,208,231,0.6)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Account & Details</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>—</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>Upload Files</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>—</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#94a3b8', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Review & Match</span>
          </div>
        </div>

        {/* Plan & Usage Banner */}
        {plan === 'free' && (
          <div
            style={{
              borderRadius: '12px',
              padding: '12px 18px',
              background: limitReached ? '#fee2e2' : '#f0fdf4',
              border: limitReached ? '1px solid #f87171' : '1px solid #86efac',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: '13px', color: limitReached ? '#991b1b' : '#166534' }}>
                {limitReached ? 'Free reconciliation limit reached' : `Free Tier: ${remainingRuns} of ${FREE_RECON_LIMIT} free reconciliations remaining`}
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: limitReached ? '#b91c1c' : '#15803d' }}>
                {limitReached ? 'Upgrade to Starter or Growth plan for unlimited multi-type reconciliations.' : 'Enjoy full-featured reconciliation for your first 2 runs.'}
              </p>
            </div>
            <Link
              href="/pricing"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#ffffff',
                background: '#10b981',
                padding: '6px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Upgrade Plan
            </Link>
          </div>
        )}

        {/* 1. Choose Reconciliation Type Selector */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Choose reconciliation type</span>
              <span style={{ fontSize: '10px', fontWeight: 800, background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase' }}>NEW</span>
            </div>
            <Link href="/reconciliation" style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', textDecoration: 'none' }}>
              ⓘ Not sure which one to choose?
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            {(Object.keys(RECONCILIATION_TYPES) as ReconciliationTypeId[]).map((typeKey) => {
              const r = RECONCILIATION_TYPES[typeKey]
              const isSelected = selectedType === typeKey
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedType(r.id)
                    setFile1(null)
                    setFile2(null)
                    setFile1Validation('')
                    setFile2Validation('')
                  }}
                  style={{
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    background: isSelected ? '#ffffff' : 'var(--neu-bg)',
                    boxShadow: isSelected
                      ? 'inset 2px 2px 4px rgba(0,0,0,0.06), 0 0 0 2px #10b981'
                      : '3px 3px 7px var(--neu-dark), -3px -3px 7px var(--neu-light)',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#10b981',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓
                    </div>
                  )}
                  <div style={{ fontSize: '18px', marginBottom: '6px' }}>
                    {r.category === 'itc' ? '📄' : r.category === 'sales' ? '📊' : r.category === 'returns' ? '📑' : '🏛️'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    {r.description}
                  </div>
                </div>
              )
            })}
          </div>

          {/* More coming soon banner */}
          <div
            style={{
              borderRadius: '8px',
              padding: '8px 14px',
              background: 'rgba(241,245,249,0.7)',
              fontSize: '12px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 700, color: '#059669' }}>More coming soon:</span>
            <span>📦 E-Invoice vs Sales Register</span>
            <span>🚚 E-Way Bill vs Sales Register</span>
            <span>📋 GSTR-4 vs Books</span>
          </div>
        </div>

        {/* 2. Metadata Form: Period, Year, GSTIN, Business Name */}
        <div
          style={{
            borderRadius: '16px',
            background: 'var(--neu-bg)',
            boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
            padding: '24px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '8px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Period / Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(200,208,231,0.8)',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none',
                }}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(200,208,231,0.8)',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none',
                }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                GSTIN (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 27AABCU9603R1ZM"
                value={gstin}
                onChange={handleGSTINChange}
                maxLength={15}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: gstinError ? '1px solid #ef4444' : '1px solid rgba(200,208,231,0.8)',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
              {gstinError && (
                <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {gstinError}
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Business Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Your business or trade name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(200,208,231,0.8)',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
            ⓘ GSTIN helps us auto-fetch reference data and improve matching accuracy.
          </div>
        </div>

        {/* 3. Dynamic Dual File Upload Dropzones */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            {/* File 1 Dropzone */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  File 1: {config.file1.label}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {config.file1.allowedExtensions.join(' / ')}
                </span>
              </div>
              <UploadZone
                label={config.file1.shortName}
                sublabel={config.file1.description}
                icon={config.category === 'itc' ? '📄' : config.category === 'sales' ? '📊' : '📑'}
                file={file1}
                onChange={handleFile1Select}
                accept={config.file1.acceptMimeTypes}
                hint={config.file1.sampleHint}
              />
              {file1Validation && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: file1Validation.startsWith('✓') ? '#059669' : '#d97706', marginTop: '6px' }}>
                  {file1Validation}
                </div>
              )}
            </div>

            {/* Middle Swap / Link Icon */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--neu-bg)',
                boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontWeight: 'bold',
                fontSize: '18px',
              }}
            >
              ↔
            </div>

            {/* File 2 Dropzone */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  File 2: {config.file2.label}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {config.file2.allowedExtensions.join(' / ')}
                </span>
              </div>
              <UploadZone
                label={config.file2.shortName}
                sublabel={config.file2.description}
                icon="📊"
                file={file2}
                onChange={handleFile2Select}
                accept={config.file2.acceptMimeTypes}
                hint={config.file2.sampleHint}
              />
              {file2Validation && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: file2Validation.startsWith('✓') ? '#059669' : '#d97706', marginTop: '6px' }}>
                  {file2Validation}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GST Portal Download Helper Notice */}
        <div
          style={{
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            padding: '12px 18px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span>
            <span>
              <strong>Download JSON or Excel files from GST portal:</strong> Returns → relevant return → Download (JSON / Excel)
            </span>
          </div>
          <Link href="/blog" style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
            Learn how to download files →
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              borderRadius: '10px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              padding: '12px 18px',
              marginBottom: '24px',
              fontSize: '13px',
              color: '#991b1b',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* Big Submit Button */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <button
            onClick={handleSubmit}
            disabled={loading || limitReached || !file1 || !file2}
            style={{
              minWidth: '280px',
              padding: '16px 36px',
              borderRadius: '14px',
              background: loading || limitReached || !file1 || !file2
                ? '#94a3b8'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 800,
              border: 'none',
              cursor: loading || limitReached || !file1 || !file2 ? 'not-allowed' : 'pointer',
              boxShadow: loading || limitReached || !file1 || !file2
                ? 'none'
                : '0 6px 20px rgba(16,185,129,0.35)',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Matching Invoices & Calculating Differences...</span>
              </>
            ) : (
              <>
                <span>Upload both files to continue</span>
                <span>→</span>
              </>
            )}
          </button>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
            Your files are processed securely in-memory and never stored permanently without encryption.
          </div>
        </div>

        {/* Trust Badges */}
        <div style={{ marginBottom: '48px' }}>
          <TrustBadges />
        </div>
      </main>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}>Loading upload page...</div>}>
      <UploadContent />
    </Suspense>
  )
}
