'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:   string
  hint?:    string
  error?:   string
  /** Show character count */
  maxLength?: number
  showCount?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      hint,
      error,
      id,
      required,
      maxLength,
      showCount = false,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref,
  ) => {
    const inputId  = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const hasError = !!error
    const [count, setCount] = React.useState(() => {
      if (typeof value === 'string') return value.length
      if (typeof defaultValue === 'string') return defaultValue.length
      return 0
    })

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCount(e.target.value.length)
      onChange?.(e)
    }

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
              {label}
              {required && <span className="ml-0.5 text-error-500" aria-hidden="true">*</span>}
            </label>
            {showCount && maxLength && (
              <span className={cn('text-xs tabular-nums', count > maxLength * 0.9 ? 'text-warning-600' : 'text-foreground-subtle')}>
                {count}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={inputId}
          required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            'flex min-h-[100px] w-full resize-y rounded-lg border border-border',
            'bg-background px-3 py-2.5 text-sm text-foreground',
            'placeholder:text-foreground-subtle',
            'outline-none transition-colors duration-[150ms]',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
            hasError
              ? 'border-error-500 focus:border-error-500 focus:ring-error-500/15'
              : 'hover:border-border-hover',
            'disabled:cursor-not-allowed disabled:bg-surface disabled:text-foreground-disabled',
            className,
          )}
          {...props}
        />

        {hasError ? (
          <p id={`${inputId}-error`} className="text-xs text-error-600" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-foreground-muted">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
