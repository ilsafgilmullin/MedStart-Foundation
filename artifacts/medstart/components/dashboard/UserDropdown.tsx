'use client'
import { useAuth } from '@/hooks/useAuth'
import { learnerTrackFor } from '@/lib/education'
const names = {
  student: 'Студент',
  tutor: 'Репетитор',
  moderator: 'Модератор',
  admin: 'Администратор',
  owner: 'Владелец',
} as const
export default function UserDropdown() {
  const { profile, role } = useAuth()
  const name = profile?.displayName || 'Пользователь'
  const roleLabel =
    role === 'student' && learnerTrackFor(profile) === 'school'
      ? 'Школьник'
      : role
        ? names[role]
        : 'Пользователь'
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 font-semibold text-white">
        {name.slice(0, 1).toUpperCase()}
      </div>
      <div className="hidden md:block">
        <p className="font-semibold leading-none text-slate-900">{name}</p>
        <p className="mt-1 text-sm text-slate-500">{roleLabel}</p>
      </div>
    </div>
  )
}
