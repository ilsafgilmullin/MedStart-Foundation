'use client'
import * as React from 'react'
import { cn, getInitials } from '@/lib/utils'

type AvatarSize   = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type StatusType   = 'online' | 'offline' | 'away' | 'busy'

const sizeClasses: Record<AvatarSize, string> = {
  xs:  'h-6  w-6  text-xs',
  sm:  'h-8  w-8  text-xs',
  md:  'h-10 w-10 text-sm',
  lg:  'h-12 w-12 text-base',
  xl:  'h-16 w-16 text-lg',
  '2xl': 'h-20 w-20 text-xl',
}

const statusColors: Record<StatusType, string> = {
  online:  'bg-success-500',
  offline: 'bg-neutral-300',
  away:    'bg-warning-500',
  busy:    'bg-error-500',
}

const statusSizes: Record<AvatarSize, string> = {
  xs:    'h-1.5 w-1.5 border',
  sm:    'h-2   w-2   border',
  md:    'h-2.5 w-2.5 border-[1.5px]',
  lg:    'h-3   w-3   border-2',
  xl:    'h-3.5 w-3.5 border-2',
  '2xl': 'h-4   w-4   border-2',
}

export interface AvatarProps {
  src?:       string
  alt?:       string
  name?:      string
  size?:      AvatarSize
  status?:    StatusType
  className?: string
  /** Custom colour for the initials fallback background */
  color?:     string
}

export function Avatar({
  src,
  alt,
  name,
  size    = 'md',
  status,
  className,
  color,
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const initials = name ? getInitials(name) : '?'

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full overflow-hidden',
          'ring-1 ring-border font-medium text-foreground-inverse select-none',
          sizeClasses[size],
          !src || imgError ? 'bg-brand-500' : 'bg-neutral-100',
        )}
        style={(!src || imgError) && color ? { backgroundColor: color } : undefined}
        aria-label={alt ?? name}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={alt ?? name ?? ''}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-background',
            statusColors[status],
            statusSizes[size],
          )}
          aria-label={status}
          role="status"
        />
      )}
    </div>
  )
}

// ─── Avatar group ──────────────────────────────────────────────────────────

export interface AvatarGroupProps {
  avatars:   Omit<AvatarProps, 'size'>[]
  size?:     AvatarSize
  max?:      number
  className?: string
}

export function AvatarGroup({ avatars, size = 'sm', max = 5, className }: AvatarGroupProps) {
  const visible  = avatars.slice(0, max)
  const overflow = avatars.length - max

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((avatar, i) => (
        <div key={i} className={i > 0 ? '-ml-2' : ''}>
          <Avatar {...avatar} size={size} className="ring-2 ring-background" />
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn('-ml-2 flex items-center justify-center rounded-full bg-neutral-200 ring-2 ring-background font-medium text-neutral-600', sizeClasses[size])}>
          <span>+{overflow}</span>
        </div>
      )}
    </div>
  )
}
