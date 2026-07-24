'use client'

import { useState, useEffect } from 'react'
import { BREAKPOINTS } from '@/lib/constants'

/**
 * Returns `true` when the window matches the given media query string.
 *
 * @example
 *   const isMobile = useMediaQuery('(max-width: 767px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// ─── Convenience hooks for standard breakpoints ────────────────────────────

export const useIsMobile  = () => useMediaQuery(`(max-width: ${BREAKPOINTS.MD - 1}px)`)
export const useIsTablet  = () => useMediaQuery(`(min-width: ${BREAKPOINTS.MD}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`)
export const useIsDesktop = () => useMediaQuery(`(min-width: ${BREAKPOINTS.LG}px)`)
