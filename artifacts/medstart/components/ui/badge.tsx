import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-surface-100 text-surface-700',
  primary:  'bg-primary-100 text-primary-700',
  success:  'bg-green-100   text-green-700',
  warning:  'bg-amber-100   text-amber-700',
  danger:   'bg-red-100     text-red-700',
  outline:  'border border-surface-200 text-surface-700 bg-transparent',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
