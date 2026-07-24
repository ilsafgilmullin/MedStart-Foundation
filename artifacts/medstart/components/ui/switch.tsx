'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type SwitchSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<SwitchSize, { track: string; thumb: string; thumbOn: string }> = {
  sm: { track: 'h-4   w-7',   thumb: 'h-3   w-3   top-0.5 left-0.5',  thumbOn: 'translate-x-3' },
  md: { track: 'h-5   w-9',   thumb: 'h-3.5 w-3.5 top-[3px] left-[3px]', thumbOn: 'translate-x-4' },
  lg: { track: 'h-6   w-11',  thumb: 'h-4.5 w-4.5 top-[3px] left-[3px]', thumbOn: 'translate-x-5' },
}

export interface SwitchProps {
  checked?:     boolean
  defaultChecked?: boolean
  onChange?:    (checked: boolean) => void
  disabled?:    boolean
  label?:       string
  description?: string
  size?:        SwitchSize
  id?:          string
  className?:   string
}

export function Switch({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  id,
  className,
}: SwitchProps) {
  const [isOn, setIsOn] = React.useState(defaultChecked)
  const controlled = checked !== undefined
  const value      = controlled ? checked : isOn
  const switchId   = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const s          = sizeClasses[size]

  const toggle = () => {
    if (disabled) return
    const next = !value
    if (!controlled) setIsOn(next)
    onChange?.(next)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      toggle()
    }
  }

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* Track */}
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={value}
        aria-disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex shrink-0 rounded-full border-2 border-transparent',
          'transition-colors duration-[200ms] ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          value ? 'bg-brand-500' : 'bg-neutral-200',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          s.track,
        )}
      >
        {/* Thumb */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute rounded-full bg-white shadow-sm',
            'transition-transform duration-[200ms] ease-in-out',
            value ? s.thumbOn : 'translate-x-0',
            s.thumb,
          )}
        />
      </button>

      {/* Labels */}
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={switchId}
              className={cn('text-sm font-medium text-foreground', !disabled && 'cursor-pointer')}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-foreground-muted">{description}</p>
          )}
        </div>
      )}
    </div>
  )
}
