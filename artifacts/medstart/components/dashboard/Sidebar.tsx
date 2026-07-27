'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { getNavigation } from './Navigation'
import { useAuth } from '@/hooks/useAuth'

const roleNames = {
  student: 'Студент',
  tutor: 'Репетитор',
  admin: 'Администратор',
  owner: 'Владелец',
} as const

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, role, logout } = useAuth()
  const name = profile?.displayName || profile?.email || 'Пользователь'
  const initial = name.slice(0, 1).toUpperCase()

  async function exit() {
    await logout()
    router.replace('/login')
  }

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 p-6">
        <Link href="/dashboard" className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-xl font-bold text-white">
            +
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">MedStart</h1>
            <p className="text-sm text-slate-500">Личный кабинет</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-5">
        {getNavigation(role).map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-medium transition ${active ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-700 hover:bg-teal-50 hover:text-teal-800'}`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-200 p-5">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{name}</p>
            <p className="text-sm text-slate-500">
              {role ? roleNames[role] : 'Пользователь'}
            </p>
          </div>
        </div>
        <button
          onClick={exit}
          className="ms-btn ms-btn-danger-outline ms-btn-block"
        >
          <LogOut className="h-5 w-5" />
          Выйти
        </button>
      </div>
    </aside>
  )
}
