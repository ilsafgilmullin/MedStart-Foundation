'use client'

import { useEffect } from 'react'

async function clearDevelopmentServiceWorker() {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith('medstart-'))
        .map((key) => caches.delete(key)),
    )
  }
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    // Replit запускает проект через next dev. Старый PWA service worker мог
    // продолжать отдавать устаревшие чанки и вызывать бесконечную загрузку.
    if (process.env.NODE_ENV !== 'production') {
      void clearDevelopmentServiceWorker().then(() => {
        if (navigator.serviceWorker.controller) {
          window.location.reload()
        }
      })
      return
    }

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
