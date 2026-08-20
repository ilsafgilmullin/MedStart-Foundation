'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileSidebar from '@/components/dashboard/MobileSidebar'
import Header from '@/components/dashboard/Header'
import { getNavigation } from '@/components/dashboard/Navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  applyUiPreferences,
  readUiPreferences,
  UI_PREFERENCES_EVENT,
  type UiPreferences,
} from '@/lib/ui-preferences'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() =>
    readUiPreferences(),
  )
  const router = useRouter()
  const { user, profile, role, loading, logout } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user || !profile) {
      router.replace('/login')
      return
    }
    if (profile.status === 'blocked' || profile.status === 'deleted') {
      void logout().finally(() => router.replace('/login'))
    }
  }, [loading, user, profile, logout, router])

  useEffect(() => {
    applyUiPreferences(uiPreferences)
    const handlePreferenceChange = (event: Event) => {
      const next = (event as CustomEvent<UiPreferences>).detail
      if (next) setUiPreferences(next)
    }
    window.addEventListener(UI_PREFERENCES_EVENT, handlePreferenceChange)
    return () =>
      window.removeEventListener(UI_PREFERENCES_EVENT, handlePreferenceChange)
  }, [uiPreferences])

  useEffect(() => {
    if (!role) return
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    if (
      connection?.saveData ||
      connection?.effectiveType?.toLowerCase().includes('2g')
    ) {
      return
    }

    let cancelled = false
    const warmRoleRoutes = () => {
      if (cancelled) return
      for (const item of getNavigation(role, profile?.status)) {
        router.prefetch(item.href)
      }
    }

    const idleWindow = window as unknown as {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number
      cancelIdleCallback?: (handle: number) => void
    }
    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warmRoleRoutes, {
        timeout: 2_500,
      })
      return () => {
        cancelled = true
        idleWindow.cancelIdleCallback?.(idleId)
      }
    }

    const timer = window.setTimeout(warmRoleRoutes, 1_200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [profile?.status, role, router])

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">
        Загрузка аккаунта…
      </div>
    )
  }

  const mainPadding =
    uiPreferences.density === 'compact'
      ? 'p-3 sm:p-4 lg:p-6'
      : 'p-4 sm:p-5 lg:p-8'

  return (
    <div className="min-h-dvh bg-slate-50">
      <MobileSidebar open={open} onClose={() => setOpen(false)} />
      <Sidebar />
      <div className="lg:ml-72">
        <Header onMenuClick={() => setOpen(true)} />
        <main className={`min-h-[calc(100dvh-64px)] ${mainPadding}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
