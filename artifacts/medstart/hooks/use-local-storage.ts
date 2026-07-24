'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Syncs state to localStorage. SSR-safe: initial value is always
 * `initialValue` on the server; the stored value is read on mount.
 *
 * @example
 *   const [theme, setTheme] = useLocalStorage('theme', 'light')
 */
export function useLocalStorage<T>(
  key:          string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [stored, setStored] = useState<T>(initialValue)

  // Read on mount (client only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item !== null) setStored(JSON.parse(item) as T)
    } catch {
      // Ignore parse errors — fall back to initialValue
    }
  }, [key])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const next = typeof value === 'function'
          ? (value as (prev: T) => T)(stored)
          : value
        setStored(next)
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Quota exceeded or private browsing — still update state
      }
    },
    [key, stored],
  )

  const remove = useCallback(() => {
    try { window.localStorage.removeItem(key) } catch { /* ignore */ }
    setStored(initialValue)
  }, [key, initialValue])

  return [stored, setValue, remove]
}
