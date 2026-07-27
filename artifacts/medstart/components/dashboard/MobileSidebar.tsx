'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, X } from 'lucide-react'
import { getNavigation } from './Navigation'
import { useAuth } from '@/hooks/useAuth'

export default function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, role, logout } = useAuth()
  const name = profile?.displayName || profile?.email || 'Пользователь'
  const roleNames = {
    student: 'Студент',
    tutor: 'Репетитор',
    admin: 'Администратор',
    owner: 'Владелец',
  } as const
  async function exit() {
    await logout()
    onClose()
    router.replace('/login')
  }
  return (
    <>
      {open && (
        <button
          aria-label="Закрыть меню"
          onClick={onClose}
          className="ms-overlay-close fixed inset-0 z-40 lg:hidden"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-white shadow-2xl transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b p-6">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="text-xl font-bold text-violet-700"
          >
            MedStart
          </Link>
          <button
            onClick={onClose}
            className="ms-icon-btn ms-icon-btn-neutral"
          >
            <X className="h-5 w-5" />
          </button>
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
                onClick={onClose}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-medium ${active ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-700 hover:bg-teal-50 hover:text-teal-800'}`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="border-t p-5">
          <div className="mb-4 rounded-2xl bg-slate-50 p-4">
            <p className="truncate font-semibold text-slate-900">{name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {role ? roleNames[role] : 'Пользователь'}
            </p>
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
    </>
  )
}
