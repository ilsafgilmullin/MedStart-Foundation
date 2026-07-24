'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type DrawerSide = 'right' | 'left' | 'bottom'

const sideClasses: Record<DrawerSide, { panel: string; animation: string }> = {
  right:  { panel: 'right-0 top-0 h-full w-full max-w-md',  animation: 'animate-[ms-slide-right_300ms_ease-out_both]' },
  left:   { panel: 'left-0 top-0 h-full w-full max-w-md',   animation: 'animate-[ms-slide-left_300ms_ease-out_both]' },
  bottom: { panel: 'bottom-0 left-0 w-full max-h-[80dvh] rounded-t-2xl', animation: 'animate-[ms-slide-bottom_300ms_ease-out_both]' },
}

export interface DrawerProps {
  open:         boolean
  onClose:      () => void
  title?:       string
  description?: string
  children?:    React.ReactNode
  footer?:      React.ReactNode
  side?:        DrawerSide
  persistent?:  boolean
  className?:   string
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side       = 'right',
  persistent = false,
  className,
}: DrawerProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !persistent) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, persistent])

  if (!mounted || !open) return null

  const { panel, animation } = sideClasses[side]

  return createPortal(
    <div className="fixed inset-0 z-[400] flex" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm animate-[ms-fade-in_200ms_ease-out_both]"
        onClick={!persistent ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute flex flex-col bg-background shadow-2xl',
          side !== 'bottom' && 'border-l border-border',
          side === 'bottom' && 'border-t border-border',
          panel,
          animation,
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-foreground-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-foreground-subtle hover:bg-neutral-100 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
