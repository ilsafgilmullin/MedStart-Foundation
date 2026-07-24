'use client'

import { useState, useCallback } from 'react'

export interface UseModalReturn {
  isOpen:  boolean
  open:    () => void
  close:   () => void
  toggle:  () => void
}

/**
 * Manages open/closed state for modals, drawers, popovers, or any overlay.
 *
 * @example
 *   const modal = useModal()
 *   return (
 *     <>
 *       <Button onClick={modal.open}>Open</Button>
 *       <Modal open={modal.isOpen} onClose={modal.close}>...</Modal>
 *     </>
 *   )
 */
export function useModal(defaultOpen = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const open   = useCallback(() => setIsOpen(true),         [])
  const close  = useCallback(() => setIsOpen(false),        [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  return { isOpen, open, close, toggle }
}
