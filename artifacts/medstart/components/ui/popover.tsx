'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type PopoverSide = 'top' | 'bottom' | 'left' | 'right'

const sideClasses: Record<PopoverSide, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-0 mr-2',
  right:  'left-full top-0 ml-2',
}

export interface PopoverProps {
  trigger:       React.ReactNode
  children:      React.ReactNode
  title?:        string
  side?:         PopoverSide
  width?:        string
  showClose?:    boolean
  className?:    string
}

export function Popover({
  trigger,
  children,
  title,
  side      = 'bottom',
  width     = 'w-72',
  showClose = false,
  className,
}: PopoverProps) {
  const [open, setOpen]  = React.useState(false)
  const containerRef     = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative inline-flex">
      {/* Trigger */}
      <div onClick={() => setOpen((v) => !v)} role="button" aria-haspopup="dialog" aria-expanded={open}>
        {trigger}
      </div>

      {/* Popover panel */}
      {open && (
        <div
          role="dialog"
          className={cn(
            'absolute z-[200] rounded-xl border border-border bg-background shadow-lg',
            'animate-[ms-slide-up_150ms_ease-out_both]',
            sideClasses[side],
            width,
            className,
          )}
        >
          {/* Header */}
          {(title || showClose) && (
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
              {showClose && (
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto rounded p-0.5 text-foreground-subtle hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {/* Content */}
          <div className="p-4">{children}</div>
        </div>
      )}
    </div>
  )
}
