'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

const sizeClasses: Record<ModalSize, string> = {
  xs:   'max-w-xs',
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-[calc(100vw-2rem)]',
}

export interface ModalProps {
  open:         boolean
  onClose:      () => void
  title?:       string
  description?: string
  children?:    React.ReactNode
  footer?:      React.ReactNode
  size?:        ModalSize
  /** Prevent close on backdrop click */
  persistent?:  boolean
  className?:   string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size        = 'md',
  persistent  = false,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  // Lock body scroll
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Escape key
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !persistent) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, persistent])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm animate-[ms-fade-in_200ms_ease-out_both]"
        onClick={!persistent ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full rounded-2xl bg-background shadow-2xl',
          'flex flex-col max-h-[90vh]',
          'animate-[ms-zoom-in_200ms_ease-out_both]',
          sizeClasses[size],
          className,
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
            <div className="flex flex-col gap-1 min-w-0">
              {title && (
                <h2 className="text-base font-semibold text-foreground leading-tight">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-foreground-muted">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-foreground-subtle hover:bg-neutral-100 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
