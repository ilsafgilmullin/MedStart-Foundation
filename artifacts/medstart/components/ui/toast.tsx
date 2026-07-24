'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

export type ToastVariant  = 'default' | 'success' | 'warning' | 'error' | 'info'
export type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'

export interface Toast {
  id:          string
  title?:      string
  description?: string
  variant?:    ToastVariant
  duration?:   number
  action?:     { label: string; onClick: () => void }
}

// ─── Context ───────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: Toast[]
  add:    (toast: Omit<Toast, 'id'>) => string
  remove: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({
  children,
  position = 'bottom-right',
  maxToasts = 5,
}: {
  children:   React.ReactNode
  position?:  ToastPosition
  maxToasts?: number
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const add = React.useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = crypto.randomUUID()
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, maxToasts))
    return id
  }, [maxToasts])

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, add, remove }}>
      {children}
      <Toaster toasts={toasts} onRemove={remove} position={position} />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}

// ─── Toaster ───────────────────────────────────────────────────────────────

const positionClasses: Record<ToastPosition, string> = {
  'top-right':     'top-4 right-4 items-end',
  'top-center':    'top-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-right':  'bottom-4 right-4 items-end',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
}

function Toaster({
  toasts,
  onRemove,
  position,
}: {
  toasts:   Toast[]
  onRemove: (id: string) => void
  position: ToastPosition
}) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  if (!mounted || toasts.length === 0) return null

  return createPortal(
    <div
      className={cn(
        'fixed z-[500] flex flex-col gap-2 pointer-events-none',
        positionClasses[position],
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body,
  )
}

// ─── Toast item ────────────────────────────────────────────────────────────

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; classes: string }> = {
  default: { icon: null,                                 classes: 'border-border' },
  success: { icon: <CheckCircle2  className="h-4 w-4 text-success-500" />, classes: 'border-success-200' },
  warning: { icon: <TriangleAlert className="h-4 w-4 text-warning-500" />, classes: 'border-warning-200' },
  error:   { icon: <AlertCircle   className="h-4 w-4 text-error-500"   />, classes: 'border-error-200'   },
  info:    { icon: <Info          className="h-4 w-4 text-info-500"    />, classes: 'border-info-100'    },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const duration = toast.duration ?? 4500
  const { icon, classes } = variantConfig[toast.variant ?? 'default']

  React.useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), duration)
    return () => clearTimeout(timer)
  }, [toast.id, duration, onRemove])

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]',
        'rounded-xl border bg-background shadow-lg px-4 py-3.5',
        'animate-[ms-slide-up_200ms_ease-out_both]',
        classes,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        )}
        {toast.description && (
          <p className="text-sm text-foreground-muted mt-0.5">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded-md p-0.5 text-foreground-subtle hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
