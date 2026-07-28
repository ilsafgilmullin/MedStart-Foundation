'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HeartPulse, LogOut, Sparkles, X } from 'lucide-react'
import { getNavigation } from './Navigation'
import { useAuth } from '@/hooks/useAuth'

const roleNames = {
  student: 'Студент',
  tutor: 'Репетитор',
  admin: 'Администратор',
  owner: 'Владелец',
} as const

function studentProfileCompletion(profile: ReturnType<typeof useAuth>['profile']) {
  if (!profile || profile.role !== 'student') return 100
  const fields = [
    profile.firstName,
    profile.lastName,
    profile.avatar,
    profile.institution,
    profile.fieldOfStudy,
    profile.studyYear,
    profile.city,
    profile.subjects?.length ? 'subjects' : '',
    profile.bio,
    profile.timezone,
  ]
  return Math.round(
    (fields.filter((value) => Boolean(String(value || '').trim())).length /
      fields.length) *
      100,
  )
}

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
  const initial = name.slice(0, 1).toUpperCase()
  const completion = studentProfileCompletion(profile)

  async function exit() {
    await logout()
    onClose()
    router.replace('/login')
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={onClose}
          className="ms-overlay-close fixed inset-0 z-40 lg:hidden"
        />
      )}
      <aside
        aria-hidden={!open}
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[84vw] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-200 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700">
              <HeartPulse className="h-5 w-5" strokeWidth={2.35} />
            </span>
            <span>
              <span className="block text-xl font-black tracking-tight text-slate-950">
                MedStart
              </span>
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">
                Учебный кабинет
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="ms-icon-btn ms-icon-btn-neutral"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
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

        <div className="border-t border-slate-200 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {role === 'student' && completion < 100 && (
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className="mb-3 block rounded-2xl border border-teal-100 bg-teal-50 p-3"
            >
              <div className="flex items-center justify-between gap-3 text-xs font-black text-teal-800">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Заполнить профиль
                </span>
                <span>{completion}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-100">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </Link>
          )}

          <Link
            href="/dashboard/profile"
            onClick={onClose}
            className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 font-black text-white">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-black text-slate-950">
                {name}
              </span>
              <span className="mt-0.5 block text-sm text-slate-500">
                {role ? roleNames[role] : 'Пользователь'}
              </span>
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
    </>
  )
}
