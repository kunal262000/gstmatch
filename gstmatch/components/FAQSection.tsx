'use client'

import { useState } from 'react'
import { FAQS } from '@/lib/faqs'

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx)
  }

  return (
    <section style={{ margin: '48px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--primary-bg)',
            color: 'var(--primary-dark)',
            fontSize: 12,
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: 'var(--r-pill)',
            marginBottom: 10,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          ✦ Frequently Asked Questions
        </div>
        <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
          Everything You Need to Know
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto' }}>
          Have questions about GSTMatch, ITC reconciliation rules, or supported file formats? We have answers.
        </p>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx
          return (
            <div
              key={faq.q}
              className="neu-raised"
              style={{
                background: 'var(--neu-bg)',
                borderRadius: 'var(--r-md)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              <button
                onClick={() => toggle(idx)}
                style={{
                  width: '100%',
                  padding: '18px 22px',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-1)',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                <span>{faq.q}</span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    marginLeft: 12,
                  }}
                >
                  ▼
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: '0 22px 20px',
                    fontSize: 14,
                    color: 'var(--text-2)',
                    lineHeight: 1.7,
                    borderTop: '1px dashed rgba(200,210,230,0.5)',
                    paddingTop: 14,
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
