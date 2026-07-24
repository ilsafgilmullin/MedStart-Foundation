'use client'
import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?:       string
  description?: string
  error?:       string
  indeterminate?: boolean
  size?:        'sm' | 'md'
}

const sizeClasses = {
  sm: { box: 'h-3.5 w-3.5', icon: 'h-2.5 w-2.5', label: 'text-xs', desc: 'text-xs' },
  md: { box: 'h-4   w-4',   icon: 'h-3   w-3',   label: 'text-sm', desc: 'text-xs' },
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      indeterminate = false,
      size = 'md',
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null)
    const checkId  = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const s        = sizeClasses[size]

    // Sync the imperative indeterminate property
    React.useImperativeHandle(ref, () => innerRef.current!, [])
    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate
    }, [indeterminate])

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={checkId}
          className={cn(
            'group flex items-start gap-2.5',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          <div className="relative flex shrink-0 items-center justify-center mt-0.5">
            <input
              ref={innerRef}
              type="checkbox"
              id={checkId}
              disabled={disabled}
              className="peer sr-only"
              aria-invalid={!!error}
              {...props}
            />
            {/* Visual box */}
            <div
              className={cn(
                'flex items-center justify-center rounded border border-border',
                'bg-background transition-all duration-[150ms]',
                'peer-checked:bg-brand-500 peer-checked:border-brand-500',
                'peer-indeterminate:bg-brand-500 peer-indeterminate:border-brand-500',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30 peer-focus-visible:ring-offset-1',
                !disabled && 'group-hover:border-brand-400',
                s.box,
              )}
            >
              {indeterminate ? (
                <Minus className={cn('text-white', s.icon)} strokeWidth={3} />
              ) : (
                <Check className={cn('text-white opacity-0 peer-checked:opacity-100 transition-opacity', s.icon)} strokeWidth={3} />
              )}
            </div>
          </div>

          {(label || description) && (
            <div className="flex flex-col gap-0.5">
              {label && (
                <span className={cn('font-medium text-foreground', s.label)}>{label}</span>
              )}
              {description && (
                <span className={cn('text-foreground-muted', s.desc)}>{description}</span>
              )}
            </div>
          )}
        </label>

        {error && (
          <p className="text-xs text-error-600 ml-6" role="alert">{error}</p>
        )}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'
