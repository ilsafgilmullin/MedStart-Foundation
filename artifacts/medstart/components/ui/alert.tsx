import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const variantClasses: Record<AlertVariant, { root: string; icon: string }> = {
  info: {
    root: 'bg-info-50 border-info-100 text-info-600',
    icon: 'text-info-500',
  },
  success: {
    root: 'bg-success-50 border-success-100 text-success-700',
    icon: 'text-success-500',
  },
  warning: {
    root: 'bg-warning-50 border-warning-100 text-warning-700',
    icon: 'text-warning-500',
  },
  error: {
    root: 'bg-error-50 border-error-100 text-error-700',
    icon: 'text-error-500',
  },
}

const variantIcons: Record<AlertVariant, React.ReactNode> = {
  info:    <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <TriangleAlert className="h-4 w-4" />,
  error:   <AlertCircle className="h-4 w-4" />,
}

export interface AlertProps {
  variant?:     AlertVariant
  title?:       string
  children?:    React.ReactNode
  dismissible?: boolean
  onDismiss?:  () => void
  className?:   string
  icon?:        React.ReactNode | false
}

export function Alert({
  variant     = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className,
  icon,
}: AlertProps) {
  const classes   = variantClasses[variant]
  const alertIcon = icon === false ? null : (icon ?? variantIcons[variant])

  return (
    <div
      role="alert"
      className={cn(
        'relative flex gap-3 rounded-xl border p-4 text-sm',
        classes.root,
        className,
      )}
    >
      {alertIcon && (
        <span className={cn('mt-0.5 shrink-0', classes.icon)} aria-hidden="true">
          {alertIcon}
        </span>
      )}

      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold leading-snug mb-0.5">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>

      {dismissible && (
        <button
          onClick={onDismiss}
          className={cn(
            'ml-auto shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current',
          )}
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
