import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Core utility ──────────────────────────────────────────────────────────

/**
 * Merges Tailwind CSS class names, resolving conflicts correctly.
 * Built on top of clsx + tailwind-merge.
 *
 * @example
 *   cn('px-4 py-2', condition && 'bg-blue-500', 'px-8')
 *   // → 'py-2 bg-blue-500 px-8'  (px-8 wins over px-4)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── String utilities ───────────────────────────────────────────────────────

/** Get initials from a full name (max 2 characters). */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

/** Truncate a string to a given length with an ellipsis. */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

/** Capitalise the first letter of a string. */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Convert a string to title case. */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Convert a string to a URL-safe slug. */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}

// ─── Number utilities ───────────────────────────────────────────────────────

/** Format a number with locale-aware notation (1234 → "1,234"). */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat('en-US', options).format(value)
}

/** Format a number as compact notation (1234 → "1.2K"). */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

// ─── Date utilities ─────────────────────────────────────────────────────────

/** Format a date as a human-readable string ("Jan 1, 2025"). */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date))
}

/** Return a relative time string ("3 minutes ago"). */
export function timeAgo(date: Date | string | number): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  const intervals: [number, string][] = [
    [60,         'second'],
    [3600,       'minute'],
    [86400,      'hour'],
    [2592000,    'day'],
    [31536000,   'month'],
    [Infinity,   'year'],
  ]
  for (let i = 0; i < intervals.length; i++) {
    const [cap, unit] = intervals[i]
    const prev = i === 0 ? 1 : intervals[i - 1][0]
    if (seconds < cap) {
      const count = Math.floor(seconds / prev)
      return `${count} ${unit}${count !== 1 ? 's' : ''} ago`
    }
  }
  return 'just now'
}

// ─── Array utilities ────────────────────────────────────────────────────────

/** Remove duplicate items from an array. */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/** Group an array of objects by a key. */
export function groupBy<T, K extends PropertyKey>(
  arr: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return arr.reduce(
    (groups, item) => {
      const k = key(item)
      ;(groups[k] ??= []).push(item)
      return groups
    },
    {} as Record<K, T[]>,
  )
}

// ─── Async utilities ────────────────────────────────────────────────────────

/** Wait for a given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── DOM utilities ──────────────────────────────────────────────────────────

/** Check if code is running in a browser environment. */
export const isBrowser = typeof window !== 'undefined'
