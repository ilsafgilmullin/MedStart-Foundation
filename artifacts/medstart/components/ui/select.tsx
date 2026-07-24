'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  label:     string
  value:     string
  disabled?: boolean
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?:    string
  hint?:     string
  error?:    string
  options?:  SelectOption[]
  size?:     'sm' | 'md' | 'lg'
  placeholder?: string
}

const sizeClasses = {
  sm: 'h-8  text-xs px-3',
  md: 'h-9  text-sm px-3',
  lg: 'h-11 text-base px-4',
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      hint,
      error,
      options = [],
      size = 'md',
      placeholder,
      id,
      required,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const hasError = !!error

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-neutral-700">
            {label}
            {required && <span className="ml-0.5 text-error-500" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            className={cn(
              'w-full appearance-none rounded-lg border border-border',
              'bg-background text-foreground',
              'pr-9 outline-none transition-colors duration-[150ms]',
              'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
              hasError
                ? 'border-error-500 focus:border-error-500 focus:ring-error-500/15'
                : 'hover:border-border-hover',
              'disabled:cursor-not-allowed disabled:bg-surface disabled:text-foreground-disabled',
              sizeClasses[size],
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle"
            aria-hidden="true"
          />
        </div>

        {hasError ? (
          <p id={`${selectId}-error`} className="text-xs text-error-600" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${selectId}-hint`} className="text-xs text-foreground-muted">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)

Select.displayName = 'Select'
