import React from 'react'

interface NeuButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
  style?: React.CSSProperties
}

const SIZES = {
  sm: { padding: '8px 16px',  fontSize: 12 },
  md: { padding: '11px 22px', fontSize: 14 },
  lg: { padding: '14px 32px', fontSize: 15 },
}

const VARIANTS: Record<string, React.CSSProperties> = {
  primary: {},
  ghost:   { color: 'var(--text-2)' },
  danger:  { background: 'var(--danger-bg)', color: 'var(--danger)',
             boxShadow: '3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light)' },
}

export default function NeuButton({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  type = 'button',
  fullWidth = false,
  style = {},
}: NeuButtonProps) {
  const { padding, fontSize } = SIZES[size]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`neu-btn ${variant === 'primary' ? 'neu-btn-primary' : ''}`}
      style={{
        padding,
        fontSize,
        fontWeight: 600,
        width: fullWidth ? '100%' : undefined,
        ...VARIANTS[variant],
        ...style,
      }}
    >
      {children}
    </button>
  )
}
