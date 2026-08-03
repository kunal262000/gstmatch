import React from 'react'

interface NeuCardProps {
  children: React.ReactNode
  className?: string
  inset?: boolean
  padding?: string
  style?: React.CSSProperties
}

export default function NeuCard({
  children,
  className = '',
  inset = false,
  padding = '20px',
  style = {},
}: NeuCardProps) {
  return (
    <div
      className={`${inset ? 'neu-inset' : 'neu-raised'} ${className}`}
      style={{ padding, background: 'var(--neu-bg)', ...style }}
    >
      {children}
    </div>
  )
}
