'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode, MouseEvent, forwardRef } from 'react'

interface ViewTransitionLinkProps {
  href: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  prefetch?: boolean
}

export default function ViewTransitionLink({
  href,
  children,
  className = '',
  style = {},
  onClick,
  prefetch = true,
}: ViewTransitionLinkProps) {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    e.preventDefault()

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        router.push(href)
      })
    } else {
      router.push(href)
    }
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </Link>
  )
}

ViewTransitionLink.displayName = 'ViewTransitionLink'