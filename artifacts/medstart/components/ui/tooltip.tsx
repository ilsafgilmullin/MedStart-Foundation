'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

const sideClasses: Record<TooltipSide, { tooltip: string; arrow: string }> = {
  top: {
    tooltip: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow:
      'top-full left-1/2 -translate-x-1/2 border-t-neutral-800 border-l-transparent border-r-transparent border-b-transparent',
  },
  bottom: {
    tooltip: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow:
      'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-800 border-l-transparent border-r-transparent border-t-transparent',
  },
  left: {
    tooltip: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow:
      'left-full top-1/2 -translate-y-1/2 border-l-neutral-800 border-t-transparent border-b-transparent border-r-transparent',
  },
  right: {
    tooltip: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow:
      'right-full top-1/2 -translate-y-1/2 border-r-neutral-800 border-t-transparent border-b-transparent border-l-transparent',
  },
}

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: TooltipSide
  delay?: number
  className?: string
  disabled?: boolean
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 300,
  className,
  disabled = false,
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { tooltip, arrow } = sideClasses[side]

  const show = () => {
    if (disabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-[600] animate-[ms-fade-in_100ms_ease-out_both]',
            tooltip
          )}
        >
          <div
            className={cn(
              'rounded-lg bg-neutral-800 px-2.5 py-1.5 text-xs text-white shadow-lg',
              'max-w-[200px] whitespace-nowrap',
              className
            )}
          >
            {content}
          </div>

          <div
            className={cn('absolute h-0 w-0 border-4', arrow)}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}