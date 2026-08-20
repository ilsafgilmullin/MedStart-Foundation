'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HeartPulse, LogOut, Sparkles } from 'lucide-react'
import { getNavigation } from './Navigation'
import { useAuth } from '@/hooks/useAuth'
import { learnerTrackFor } from '@/lib/education'
import { getProfileCompletion } from '@/lib/profile-completion'

const roleNames = {
  student: 'Студент',
  tutor: 'Репетитор',
  moderator: 'Модератор',
  admin: 'Администратор',
  owner: 'Владелец',
} as const

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, role, logout } = useAuth()
  const name = profile?.displayName || profile?.email || 'Пользователь'
  const initial = name.slice(0, 1).toUpperCase()
  const completion = getProfileCompletion(profile)
  const roleLabel =
    role === 'student' && learnerTrackFor(profile) === 'school'
      ? 'Школьник'
      : role
        ? roleNames[role]
        : 'Пользователь'

  async function exit() {
    await logout()
    router.replace('/login')
  }

  return (
    <aside className="fixed left-0 top-0 hidden h-dvh w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700 shadow-sm">
            <HeartPulse className="h-6 w-6" strokeWidth={2.35} />
          </span>
          <span>
            <span className="block text-xl font-black tracking-tight text-slate-950">
              MedStart
            </span>
            <span className="block text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
              {role === 'owner'
                ? 'Центр владельца'
                : role === 'admin'
                  ? 'Панель администратора'
                  : role === 'moderator'
                    ? 'Панель модератора'
                    : role === 'tutor'
                      ? 'Кабинет преподавателя'
                      : 'Учебный кабинет'}
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
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
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${
                active
                  ? 'bg-teal-700 !text-white shadow-md shadow-teal-900/10'
                  : 'text-slate-700 hover:bg-teal-50 hover:text-teal-900'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2.15} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        {(role === 'student' || role === 'tutor') &&
          completion.percent < 100 && (
            <Link
              href="/dashboard/profile"
              className="mb-3 block rounded-2xl border border-teal-100 bg-teal-50 p-3"
            >
              <div className="flex items-center justify-between gap-3 text-xs font-black text-teal-800">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {role === 'tutor'
                    ? 'Анкета преподавателя'
                    : 'Учебный профиль'}
                </span>
                <span>{completion.percent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-100">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
            </Link>
          )}

        <Link
          href="/dashboard/profile"
          className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 font-black text-white">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-black text-slate-950">
              {name}
            </span>
            <span className="block text-sm text-slate-500">{roleLabel}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void exit()}
          className="ms-btn ms-btn-danger-outline ms-btn-block"
        >
          <LogOut className="h-5 w-5" />
          Выйти
        </button>
      </div>
    </aside>
  )
}
