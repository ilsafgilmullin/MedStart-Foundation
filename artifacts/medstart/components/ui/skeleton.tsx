import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Base skeleton ─────────────────────────────────────────────────────────

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text'
  width?:   string | number
  height?:  string | number
  lines?:   number  // for variant="text", number of lines
}

export function Skeleton({
  className,
  variant = 'rect',
  width,
  height,
  lines = 1,
  style,
  ...props
}: SkeletonProps) {
  if (variant === 'text') {
    return (
      <div className={cn('flex flex-col gap-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton-shimmer h-4 rounded-md',
              i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'skeleton-shimmer',
        variant === 'circle' ? 'rounded-full' : 'rounded-lg',
        className,
      )}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  )
}

// ─── Preset skeletons ──────────────────────────────────────────────────────

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-background p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} className="w-1/2" />
          <Skeleton height={12} className="w-1/3" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={14} className={cn('flex-1', i === 0 && 'max-w-[120px]')} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-4 py-2">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} height={14} className={cn('flex-1', col === 0 && 'max-w-[120px]')} />
          ))}
        </div>
      ))}
    </div>
  )
}
