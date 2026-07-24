import * as React from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  label:       string
  value:       string | number
  /** Percentage change, positive = up, negative = down */
  change?:     number
  changeLabel?: string
  icon?:       React.ReactNode
  /** Accent colour dot / icon background */
  accent?:     'brand' | 'success' | 'warning' | 'error' | 'neutral'
  trend?:      React.ReactNode // e.g. a mini sparkline
  footer?:     string
  className?:  string
  loading?:    boolean
}

const accentClasses: Record<NonNullable<StatCardProps['accent']>, string> = {
  brand:   'bg-brand-50   text-brand-500',
  success: 'bg-success-50 text-success-500',
  warning: 'bg-warning-50 text-warning-500',
  error:   'bg-error-50   text-error-500',
  neutral: 'bg-neutral-100 text-neutral-500',
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accent    = 'brand',
  trend,
  footer,
  className,
  loading   = false,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0
  const isNegative = change !== undefined && change < 0

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-border bg-background p-6 shadow-sm', className)}>
        <div className="skeleton-shimmer h-4 w-24 rounded-md mb-4" />
        <div className="skeleton-shimmer h-8 w-32 rounded-md mb-2" />
        <div className="skeleton-shimmer h-3 w-16 rounded-md" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-background p-6 shadow-sm',
        'transition-shadow duration-[200ms] hover:shadow-md',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-sm font-medium text-foreground-muted">{label}</p>
        {icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accentClasses[accent])}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <p className="text-3xl font-bold tracking-tight text-foreground leading-none mb-2">
        {value}
      </p>

      {/* Change */}
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              isPositive && 'text-success-600',
              isNegative && 'text-error-600',
            )}
          >
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-foreground-subtle">{changeLabel}</span>
          )}
        </div>
      )}

      {/* Mini chart / trend */}
      {trend && <div className="mt-4">{trend}</div>}

      {/* Footer */}
      {footer && (
        <p className="mt-4 pt-4 border-t border-border text-xs text-foreground-subtle">{footer}</p>
      )}
    </div>
  )
}
