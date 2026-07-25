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
  const { user, profile, loading } = useAuth()
  useEffect(() => { if (!loading && (!user || !profile)) router.replace('/login') }, [loading, user, profile, router])
  if (loading || !user || !profile) return <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">Загрузка аккаунта…</div>
  return <div className="min-h-screen bg-slate-50"><MobileSidebar open={open} onClose={() => setOpen(false)} /><Sidebar /><div className="lg:ml-72"><Header onMenuClick={() => setOpen(true)} /><main className="min-h-[calc(100vh-64px)] p-5 lg:p-8">{children}</main></div></div>
}
