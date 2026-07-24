import * as React from 'react'
import { cn } from '@/lib/utils'

type LoaderVariant = 'spinner' | 'dots' | 'bar'
type LoaderSize    = 'xs' | 'sm' | 'md' | 'lg'

// ─── Spinner ───────────────────────────────────────────────────────────────

const spinnerSizes: Record<LoaderSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

function SpinnerLoader({ size, className }: { size: LoaderSize; className?: string }) {
  return (
    <svg
      className={cn('animate-[ms-spin_1s_linear_infinite]', spinnerSizes[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ─── Dots ──────────────────────────────────────────────────────────────────

const dotSizes: Record<LoaderSize, string> = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
}

function DotsLoader({ size, className }: { size: LoaderSize; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('rounded-full bg-current animate-[ms-bounce-dot_1.4s_ease-in-out_infinite]', dotSizes[size])}
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  )
}

// ─── Bar ───────────────────────────────────────────────────────────────────

function BarLoader({ className }: { className?: string }) {
  return (
    <div className={cn('h-0.5 w-full overflow-hidden rounded-full bg-neutral-200', className)}>
      <div
        className="h-full w-1/3 rounded-full bg-brand-500"
        style={{ animation: 'ms-slide-right 1.5s ease-in-out infinite' }}
        aria-hidden="true"
      />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export interface LoaderProps {
  variant?:  LoaderVariant
  size?:     LoaderSize
  label?:    string
  className?: string
  color?:    string
}

export function Loader({
  variant   = 'spinner',
  size      = 'md',
  label,
  className,
  color,
}: LoaderProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('inline-flex items-center gap-2 text-brand-500', className)}
      style={color ? { color } : undefined}
    >
      {variant === 'spinner' && <SpinnerLoader size={size} />}
      {variant === 'dots'    && <DotsLoader    size={size} />}
      {variant === 'bar'     && <BarLoader />}
      {label && <span className="text-sm text-foreground-muted">{label}</span>}
      <span className="sr-only">{label ?? 'Loading...'}</span>
    </div>
  )
}

// ─── Full-page loader ──────────────────────────────────────────────────────

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader size="lg" label={label} />
    </div>
  )
}
