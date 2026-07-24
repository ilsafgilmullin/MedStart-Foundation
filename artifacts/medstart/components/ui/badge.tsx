import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info' | 'outline'
type BadgeSize    = 'sm' | 'md'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100  text-neutral-700',
  brand:   'bg-brand-100   text-brand-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error:   'bg-error-100   text-error-700',
  info:    'bg-info-100    text-info-600',
  outline: 'border border-border bg-transparent text-neutral-600',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?:    BadgeSize
  dot?:     boolean
}

export function Badge({
  className,
  variant = 'default',
  size    = 'sm',
  dot     = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            variant === 'default'  && 'bg-neutral-500',
            variant === 'brand'    && 'bg-brand-500',
            variant === 'success'  && 'bg-success-500',
            variant === 'warning'  && 'bg-warning-500',
            variant === 'error'    && 'bg-error-500',
            variant === 'info'     && 'bg-info-500',
            variant === 'outline'  && 'bg-neutral-400',
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
