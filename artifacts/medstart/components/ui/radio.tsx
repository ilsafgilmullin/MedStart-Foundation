import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Radio item ────────────────────────────────────────────────────────────

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?:       string
  description?: string
  size?:        'sm' | 'md'
}

const sizeClasses = {
  sm: { outer: 'h-3.5 w-3.5', inner: 'h-1.5 w-1.5', label: 'text-xs', desc: 'text-xs' },
  md: { outer: 'h-4   w-4',   inner: 'h-2   w-2',   label: 'text-sm', desc: 'text-xs' },
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, size = 'md', id, disabled, ...props }, ref) => {
    const radioId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const s = sizeClasses[size]

    return (
      <label
        htmlFor={radioId}
        className={cn(
          'group flex items-start gap-2.5',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        <div className="relative flex shrink-0 items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          {/* Outer ring */}
          <div
            className={cn(
              'flex items-center justify-center rounded-full border border-border bg-background',
              'transition-all duration-[150ms]',
              'peer-checked:border-brand-500',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30 peer-focus-visible:ring-offset-1',
              !disabled && 'group-hover:border-brand-400',
              s.outer,
            )}
          >
            {/* Inner dot */}
            <div
              className={cn(
                'rounded-full bg-brand-500 scale-0 transition-transform duration-[150ms]',
                'peer-checked:scale-100',
                s.inner,
              )}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && <span className={cn('font-medium text-foreground', s.label)}>{label}</span>}
            {description && <span className={cn('text-foreground-muted', s.desc)}>{description}</span>}
          </div>
        )}
      </label>
    )
  },
)

Radio.displayName = 'Radio'

// ─── Radio group ───────────────────────────────────────────────────────────

export interface RadioOption {
  label:        string
  value:        string
  description?: string
  disabled?:    boolean
}

export interface RadioGroupProps {
  name:        string
  options:     RadioOption[]
  value?:      string
  onChange?:   (value: string) => void
  label?:      string
  error?:      string
  orientation?: 'vertical' | 'horizontal'
  size?:       'sm' | 'md'
  className?:  string
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  orientation = 'vertical',
  size = 'md',
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn('border-none p-0 m-0', className)}>
      {label && (
        <legend className="text-sm font-medium text-neutral-700 mb-2">{label}</legend>
      )}
      <div className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}>
        {options.map((opt) => (
          <Radio
            key={opt.value}
            name={name}
            value={opt.value}
            label={opt.label}
            description={opt.description}
            disabled={opt.disabled}
            checked={value === opt.value}
            onChange={() => onChange?.(opt.value)}
            size={size}
          />
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-error-600" role="alert">{error}</p>}
    </fieldset>
  )
}
