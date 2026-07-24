'use client'

import { useState, useEffect } from 'react'

/**
 * Returns a debounced copy of `value` that only updates after
 * `delay` ms of inactivity. Useful for search inputs.
 *
 * @example
 *   const [query, setQuery] = useState('')
 *   const debouncedQuery = useDebounce(query, 300)
 *   // only fires a request when the user stops typing for 300ms
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
