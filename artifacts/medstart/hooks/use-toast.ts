'use client'

import { useToastContext } from '@/components/ui/toast'
import type { Toast } from '@/components/ui/toast'

/**
 * Convenience hook for firing toasts from any component.
 *
 * @example
 *   const toast = useToast()
 *   toast.success({ title: 'Saved!', description: 'Your changes were saved.' })
 */
export function useToast() {
  const { add, remove, toasts } = useToastContext()

  return {
    toasts,
    dismiss: remove,

    toast: (toast: Omit<Toast, 'id'>) => add(toast),

    success: (toast: Omit<Toast, 'id' | 'variant'>) =>
      add({ ...toast, variant: 'success' }),

    error: (toast: Omit<Toast, 'id' | 'variant'>) =>
      add({ ...toast, variant: 'error' }),

    warning: (toast: Omit<Toast, 'id' | 'variant'>) =>
      add({ ...toast, variant: 'warning' }),

    info: (toast: Omit<Toast, 'id' | 'variant'>) =>
      add({ ...toast, variant: 'info' }),
  }
}
