'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type TabsVariant = 'underline' | 'pill' | 'boxed'

export interface TabItem {
  value:    string
  label:    string
  icon?:    React.ReactNode
  badge?:   string | number
  disabled?: boolean
  content?: React.ReactNode
}

export interface TabsProps {
  items:        TabItem[]
  defaultValue?: string
  value?:       string
  onChange?:    (value: string) => void
  variant?:     TabsVariant
  fullWidth?:   boolean
  className?:   string
}

// ─── Variant styles ────────────────────────────────────────────────────────

const tabVariants: Record<TabsVariant, { list: string; tab: string; active: string; inactive: string }> = {
  underline: {
    list:     'border-b border-border gap-0',
    tab:      'relative px-4 py-2.5 text-sm font-medium -mb-px border-b-2 border-transparent',
    active:   'border-brand-500 text-brand-600',
    inactive: 'text-foreground-muted hover:text-foreground hover:border-border',
  },
  pill: {
    list:     'bg-surface rounded-xl p-1 gap-1',
    tab:      'rounded-lg px-4 py-2 text-sm font-medium',
    active:   'bg-background shadow-sm text-foreground',
    inactive: 'text-foreground-muted hover:text-foreground',
  },
  boxed: {
    list:     'border border-border rounded-xl p-1 gap-1 bg-surface',
    tab:      'rounded-lg px-3 py-1.5 text-sm font-medium',
    active:   'bg-background shadow-xs text-foreground border border-border',
    inactive: 'text-foreground-muted hover:text-foreground',
  },
}

// ─── Component ─────────────────────────────────────────────────────────────

export function Tabs({
  items,
  defaultValue,
  value,
  onChange,
  variant    = 'underline',
  fullWidth  = false,
  className,
}: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(
    defaultValue ?? items.find((i) => !i.disabled)?.value ?? '',
  )

  const controlled = value !== undefined
  const current    = controlled ? value : activeTab

  const handleSelect = (val: string) => {
    if (!controlled) setActiveTab(val)
    onChange?.(val)
  }

  const v = tabVariants[variant]

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab list */}
      <div
        role="tablist"
        className={cn('flex items-center', v.list, fullWidth && '[&>button]:flex-1')}
      >
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={current === item.value}
            aria-controls={`tabpanel-${item.value}`}
            disabled={item.disabled}
            onClick={() => !item.disabled && handleSelect(item.value)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap transition-all duration-[150ms]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-40',
              v.tab,
              current === item.value ? v.active : v.inactive,
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            {item.label}
            {item.badge !== undefined && (
              <span className="ml-0.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-xs font-medium text-neutral-600 leading-none">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {items.map((item) => (
        <div
          key={item.value}
          id={`tabpanel-${item.value}`}
          role="tabpanel"
          aria-labelledby={item.value}
          hidden={current !== item.value}
          className="focus:outline-none"
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
