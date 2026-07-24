import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  hint?:      string
  error?:     string
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
  leftAddon?: string
  rightAddon?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      id,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const hasError = !!error

    return (
      <div className="flex w-full flex-col gap-1.5">
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
            {label}
            {required && <span className="ml-0.5 text-error-500" aria-hidden="true">*</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className="flex">
          {/* Left addon */}
          {leftAddon && (
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-surface px-3 text-sm text-foreground-muted select-none">
              {leftAddon}
            </span>
          )}

          {/* Input container */}
          <div className={cn('relative flex flex-1 items-center', leftAddon && 'flex-1', rightAddon && 'flex-1')}>
            {leftIcon && (
              <span className="pointer-events-none absolute left-3 text-foreground-subtle">
                {leftIcon}
              </span>
            )}

            <input
              ref={ref}
              id={inputId}
              required={required}
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={
                hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
              }
              className={cn(
                // Base
                'flex h-9 w-full bg-background px-3 text-sm text-foreground',
                'placeholder:text-foreground-subtle',
                'border border-border',
                // Radius — adjust for addons
                !leftAddon && !rightAddon && 'rounded-lg',
                leftAddon  && !rightAddon && 'rounded-r-lg',
                !leftAddon && rightAddon  && 'rounded-l-lg',
                leftAddon  && rightAddon  && 'rounded-none',
                // Focus
                'outline-none transition-colors duration-[150ms]',
                'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
                // Error
                hasError
                  ? 'border-error-500 focus:border-error-500 focus:ring-error-500/15'
                  : 'hover:border-border-hover',
                // Disabled
                'disabled:cursor-not-allowed disabled:bg-surface disabled:text-foreground-disabled disabled:border-border',
                // Icon padding
                leftIcon  && 'pl-9',
                rightIcon && 'pr-9',
                className,
              )}
              {...props}
            />

            {rightIcon && (
              <span className="pointer-events-none absolute right-3 text-foreground-subtle">
                {rightIcon}
              </span>
            )}
          </div>

          {/* Right addon */}
          {rightAddon && (
            <span className="inline-flex items-center rounded-r-lg border border-l-0 border-border bg-surface px-3 text-sm text-foreground-muted select-none">
              {rightAddon}
            </span>
          )}
        </div>

        {/* Message */}
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

Input.displayName = 'Input'
