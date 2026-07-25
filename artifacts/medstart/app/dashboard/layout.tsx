'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from '@/components/dashboard/Sidebar'
import MobileSidebar from '@/components/dashboard/MobileSidebar'
import Header from '@/components/dashboard/Header'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user, profile, loading, error } = useAuth()

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace('/login')
    }
  }, [loading, user, profile, router])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">
        Загрузка аккаунта…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Не удалось открыть кабинет
          </h1>
          <p className="mt-3 text-sm leading-6 text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileSidebar open={open} onClose={() => setOpen(false)} />
      <Sidebar />
      <div className="lg:ml-72">
        <Header onMenuClick={() => setOpen(true)} />
        <main className="min-h-[calc(100vh-64px)] p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
