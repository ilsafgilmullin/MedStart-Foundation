import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?:        React.ReactNode
  title:        string
  description?: string
  action?:      React.ReactNode
  size?:        'sm' | 'md' | 'lg'
  className?:   string
  border?:      boolean
}

const sizeClasses = {
  sm: { icon: 'h-10 w-10 p-2.5', title: 'text-sm', desc: 'text-xs', gap: 'gap-2' },
  md: { icon: 'h-12 w-12 p-3',   title: 'text-base', desc: 'text-sm', gap: 'gap-3' },
  lg: { icon: 'h-16 w-16 p-4',   title: 'text-lg',   desc: 'text-base', gap: 'gap-4' },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size      = 'md',
  className,
  border    = false,
}: EmptyStateProps) {
  const s = sizeClasses[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        border && 'rounded-2xl border-2 border-dashed border-border',
        size === 'sm' ? 'py-8 px-4' : size === 'lg' ? 'py-20 px-8' : 'py-12 px-6',
        className,
      )}
    >
      <div className={cn('flex flex-col items-center', s.gap)}>
        {icon && (
          <div className={cn('rounded-xl bg-surface-2 text-foreground-subtle', s.icon)}>
            {icon}
          </div>
        )}

        <div className="flex flex-col gap-1 max-w-xs">
          <p className={cn('font-semibold text-foreground', s.title)}>{title}</p>
          {description && (
            <p className={cn('text-foreground-muted', s.desc)}>{description}</p>
          )}
        </div>

        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  )
}
