'use client'

import * as React from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DropdownItem {
  type?:     'item' | 'separator' | 'label'
  label?:    string
  value?:    string
  icon?:     React.ReactNode
  shortcut?: string
  checked?:  boolean
  disabled?: boolean
  danger?:   boolean
  onClick?:  () => void
  children?: DropdownItem[]
}

export interface DropdownProps {
  trigger:    React.ReactNode
  items:      DropdownItem[]
  align?:     'left' | 'right'
  className?: string
}

// ─── Component ─────────────────────────────────────────────────────────────

export function Dropdown({ trigger, items, align = 'left', className }: DropdownProps) {
  const [open, setOpen]         = React.useState(false)
  const containerRef            = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <div onClick={() => setOpen((v) => !v)} role="button" aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-[100] mt-1.5 min-w-[10rem] rounded-xl border border-border bg-background p-1 shadow-lg',
            'animate-[ms-slide-up_150ms_ease-out_both]',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {items.map((item, i) => (
            <DropdownMenuItem
              key={i}
              item={item}
              onClose={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Menu item ─────────────────────────────────────────────────────────────

function DropdownMenuItem({ item, onClose }: { item: DropdownItem; onClose: () => void }) {
  if (item.type === 'separator') {
    return <div className="my-1 h-px bg-border" role="separator" />
  }

  if (item.type === 'label') {
    return (
      <div className="px-2 py-1.5 text-xs font-semibold text-foreground-muted uppercase tracking-wide">
        {item.label}
      </div>
    )
  }

  const handleClick = () => {
    if (item.disabled) return
    item.onClick?.()
    onClose()
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left',
        'transition-colors duration-[100ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        item.danger
          ? 'text-error-600 hover:bg-error-50 focus-visible:ring-error-500'
          : 'text-foreground hover:bg-surface',
        item.disabled && 'cursor-not-allowed opacity-40 pointer-events-none',
      )}
    >
      {item.icon && <span className="shrink-0 text-foreground-muted">{item.icon}</span>}
      <span className="flex-1">{item.label}</span>
      {item.checked !== undefined && (
        <Check className={cn('h-3.5 w-3.5', item.checked ? 'opacity-100' : 'opacity-0')} />
      )}
      {item.shortcut && (
        <kbd className="ml-auto text-xs text-foreground-subtle">{item.shortcut}</kbd>
      )}
      {item.children && <ChevronRight className="ml-auto h-3.5 w-3.5 text-foreground-subtle" />}
    </button>
  )
}
