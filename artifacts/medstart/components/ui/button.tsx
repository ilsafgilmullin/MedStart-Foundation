'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Variants & sizes ──────────────────────────────────────────────────────

type Variant    = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
type Size       = 'xs' | 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:     'bg-brand-500 text-neutral-0 shadow-xs hover:bg-brand-600 active:bg-brand-700',
  secondary:   'bg-neutral-100 text-neutral-800 shadow-xs hover:bg-neutral-200 active:bg-neutral-300',
  outline:     'border border-border bg-background text-neutral-700 shadow-xs hover:bg-surface hover:border-border-hover',
  ghost:       'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
  destructive: 'bg-error-500 text-neutral-0 shadow-xs hover:bg-error-600 active:bg-error-700',
  link:        'text-brand-600 underline-offset-4 hover:underline h-auto p-0',
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-7  px-2.5 text-xs  gap-1.5 rounded-md',
  sm: 'h-8  px-3   text-sm  gap-1.5 rounded-lg',
  md: 'h-9  px-4   text-sm  gap-2   rounded-lg',
  lg: 'h-11 px-6   text-base gap-2.5 rounded-xl',
}

// ─── Spinner ───────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-[ms-spin_1s_linear_infinite] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant
  size?:      Size
  loading?:   boolean
  fullWidth?: boolean
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
  /** Render as a Next.js Link */
  href?:     string
  /** Open in a new tab (requires href) */
  external?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant   = 'primary',
      size      = 'md',
      loading   = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      href,
      external,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const base = cn(
      'inline-flex items-center justify-center font-medium whitespace-nowrap',
      'transition-all duration-[150ms] ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'select-none cursor-pointer',
      'active:scale-[0.98]',
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && 'w-full',
      className,
    )

    const content = (
      <>
        {loading ? <Spinner /> : leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
        {children}
        {!loading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      </>
    )

    if (href) {
      if (external) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className={base}>
            {content}
          </a>
        )
      }
      return (
        <Link href={href} className={base}>
          {content}
        </Link>
      )
    }

    return (
      <button ref={ref} disabled={disabled || loading} className={base} {...props}>
        {content}
      </button>
    )
  },
)

Button.displayName = 'Button'
