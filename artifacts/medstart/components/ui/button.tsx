import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Variants ──────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  secondary:
    'bg-surface-100 text-surface-800 shadow-xs hover:bg-surface-200 active:bg-surface-300 focus-visible:ring-2 focus-visible:ring-surface-400 focus-visible:ring-offset-2',
  outline:
    'border border-surface-200 bg-surface-0 text-surface-800 shadow-xs hover:bg-surface-50 active:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  ghost:
    'text-surface-700 hover:bg-surface-100 active:bg-surface-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  danger:
    'bg-error text-white shadow-sm hover:bg-red-600 active:bg-red-700 focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8  px-3  text-sm  gap-1.5',
  md: 'h-10 px-4  text-sm  gap-2',
  lg: 'h-12 px-6  text-base gap-2.5',
}

// ─── Component ─────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          'inline-flex items-center justify-center rounded-md font-medium',
          'transition-colors duration-150',
          'disabled:pointer-events-none disabled:opacity-50',
          'cursor-pointer select-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
