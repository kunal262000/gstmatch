'use client'

import { useRef, useState, DragEvent } from 'react'

interface UploadZoneProps {
  label:       string
  sublabel:    string
  icon:        string
  accept:      string
  file:        File | null
  onChange:    (file: File | null) => void
  hint?:       string
}

export default function UploadZone({
  label, sublabel, icon, accept, file, onChange, hint,
}: UploadZoneProps) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')

  const validateFile = (selected: File): boolean => {
    setError('')
    if (selected.size === 0) {
      setError('File is empty')
      return false
    }
    if (selected.size > 50 * 1024 * 1024) {
      setError('File is too large (max 50MB)')
      return false
    }

    const ext = '.' + selected.name.split('.').pop()?.toLowerCase()
    const allowed = accept.split(',').map(s => s.trim().toLowerCase())
    if (!allowed.includes(ext)) {
      setError(`Invalid format. Allowed: ${accept}`)
      return false
    }

    return true
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDrag(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      if (validateFile(dropped)) {
        onChange(dropped)
      } else {
        onChange(null)
      }
    }
  }

  const handleDrag  = (e: DragEvent) => { e.preventDefault(); setDrag(true)  }
  const handleLeave = ()              => setDrag(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (validateFile(selected)) {
        onChange(selected)
      } else {
        onChange(null)
        e.target.value = ''
      }
    }
  }

  const filled = !!file

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragLeave={handleLeave}
        style={{
          background:   'var(--neu-bg)',
          borderRadius: 'var(--r-md)',
          padding:      '28px 20px',
          textAlign:    'center',
          cursor:       'pointer',
          transition:   'all 0.2s',
          boxShadow: filled
            ? 'inset 4px 4px 8px var(--neu-dark), inset -4px -4px 8px var(--neu-light)'
            : drag
              ? '0 0 0 2px var(--primary), 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)'
              : '6px 6px 14px var(--neu-dark), -6px -6px 14px var(--neu-light)',
        }}
      >
        {/* Icon circle */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: filled ? 'var(--primary-bg)' : error ? 'var(--danger-bg)' : 'var(--neu-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          fontSize: 24,
          boxShadow: filled
            ? 'none'
            : '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)',
        }}>
          {filled ? '✅' : error ? '⚠️' : icon}
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {filled ? file.name : sublabel}
        </div>

        {filled && (
          <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginTop: 8 }}>
            ✓ File ready
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 8 }}>
            {error}
          </div>
        )}

        {!filled && !error && (
          <div style={{
            marginTop: 14, fontSize: 12, color: 'var(--primary)',
            background: 'var(--primary-bg)', display: 'inline-block',
            padding: '5px 14px', borderRadius: 'var(--r-pill)', fontWeight: 600,
          }}>
            Browse file
          </div>
        )}
      </div>

      {hint && (
        <div style={{
          marginTop: 8, fontSize: 12, color: '#92400e',
          background: 'var(--warning-bg)', borderRadius: 8,
          padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'flex-start',
        }}>
          <span>💡</span>
          <span>{hint}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
