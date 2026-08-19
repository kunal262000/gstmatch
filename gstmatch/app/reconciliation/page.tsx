'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import NeuCard from '@/components/ui/NeuCard'
import NeuButton from '@/components/ui/NeuButton'
import TrustBadges from '@/components/TrustBadges'
import {
  RECONCILIATION_TYPES,
  RECONCILIATION_CATEGORIES,
  ReconciliationCategory,
  ReconciliationConfig,
} from '@/lib/reconciliation-registry'

export default function ReconciliationHubPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const allRecons = Object.values(RECONCILIATION_TYPES)

  const filteredRecons = selectedCategory === 'all'
    ? allRecons
    : allRecons.filter((r) => r.category === selectedCategory)

  const handleStartRecon = (typeId: string) => {
    router.push(`/upload?type=${typeId}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neu-bg)' }}>
      <NavBar />

      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header Title Section */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e0e7ff',
              color: '#4338ca',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              marginBottom: '12px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            ✦ Comprehensive GST Suite
          </div>
          <h1
            style={{
              fontSize: '34px',
              fontWeight: 800,
              color: '#1e293b',
              marginBottom: '10px',
              letterSpacing: '-0.02em',
            }}
          >
            Choose Your Reconciliation Type
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#64748b',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Select from 7 specialized reconciliation workflows. Upload required GST returns and accounting data to pinpoint mismatches, claim 100% ITC, and avoid notices.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '32px',
          }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '8px 18px',
              borderRadius: '24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s ease',
              background: selectedCategory === 'all' ? '#10b981' : 'var(--neu-bg)',
              color: selectedCategory === 'all' ? '#ffffff' : '#475569',
              boxShadow: selectedCategory === 'all' ? '0 4px 12px rgba(16,185,129,0.3)' : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
            }}
          >
            All Reconciliations ({allRecons.length})
          </button>
          {RECONCILIATION_CATEGORIES.map((cat) => {
            const count = allRecons.filter((r) => r.category === cat.id).length
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  background: isSelected ? '#10b981' : 'var(--neu-bg)',
                  color: isSelected ? '#ffffff' : '#475569',
                  boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.3)' : '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
                }}
              >
                {cat.name} ({count})
              </button>
            )
          })}
        </div>

        {/* Reconciliation Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {filteredRecons.map((recon: ReconciliationConfig) => (
            <div
              key={recon.id}
              style={{
                borderRadius: '16px',
                background: 'var(--neu-bg)',
                boxShadow: '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                border: recon.popular ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.6)',
                position: 'relative',
              }}
            >
              {recon.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  POPULAR
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0ea5e9',
                      background: '#e0f2fe',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {recon.categoryLabel}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                    }}
                  >
                    {recon.level === 'invoice' ? 'Invoice-level matching' : 'Summary return comparison'}
                  </span>
                </div>

                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '8px',
                    lineHeight: 1.3,
                  }}
                >
                  {recon.name}
                </h2>

                <p
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    lineHeight: 1.5,
                    marginBottom: '16px',
                    minHeight: '40px',
                  }}
                >
                  {recon.description}
                </p>

                {/* File comparison badge box */}
                <div
                  style={{
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(200,208,231,0.5)',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#334155',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase' }}>
                    Files Compared
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ color: '#0f172a' }}>📄 {recon.file1.shortName}</span>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>↔</span>
                    <span style={{ color: '#0f172a' }}>📊 {recon.file2.shortName}</span>
                  </div>
                </div>

                {/* Metric highlight */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontSize: '12px', color: '#059669' }}>
                  <span>🎯</span>
                  <span style={{ fontWeight: 600 }}>Identifies: {recon.financialMetricLabel}</span>
                </div>
              </div>

              <button
                onClick={() => handleStartRecon(recon.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>Start Reconciliation</span>
                <span>→</span>
              </button>
            </div>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div
          style={{
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.4)',
            border: '1px dashed #cbd5e1',
            padding: '18px 24px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '13px',
            marginBottom: '40px',
          }}
        >
          <span style={{ fontWeight: 600, color: '#334155' }}>More Reconciliations Coming Soon:</span> E-Invoice vs Sales Register • E-Way Bill vs Sales Register • GSTR-4 Composition vs Books • Bank Statement vs Books
        </div>

        <TrustBadges />
      </main>
    </div>
  )
}
