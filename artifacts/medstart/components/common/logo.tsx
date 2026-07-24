import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'

export interface LogoProps {
  size?:        'sm' | 'md' | 'lg'
  showName?:    boolean
  className?:   string
}

const sizeClasses = {
  sm: { mark: 'h-6 w-6',   text: 'text-sm'  },
  md: { mark: 'h-7 w-7',   text: 'text-base' },
  lg: { mark: 'h-9 w-9',   text: 'text-lg'  },
}

export function Logo({ size = 'md', showName = true, className }: LogoProps) {
  const s = sizeClasses[size]

  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      {/* Mark */}
      <div className={cn('flex items-center justify-center rounded-lg bg-brand-500 shrink-0', s.mark)}>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-[60%] w-[60%] text-white"
          aria-hidden="true"
        >
          {/* Cross / plus symbol — universal for medical */}
          <rect x="8.5" y="2" width="3" height="16" rx="1.5" fill="currentColor" />
          <rect x="2" y="8.5" width="16" height="3" rx="1.5" fill="currentColor" />
        </svg>
      </div>

      {/* Name */}
      {showName && (
        <span className={cn('font-semibold text-foreground tracking-tight', s.text)}>
          {APP_NAME}
        </span>
      )}
    </div>
  )
}
