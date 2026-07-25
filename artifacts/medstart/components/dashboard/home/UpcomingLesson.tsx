'use client'

import Link from 'next/link'
import { CalendarClock, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

export default function UpcomingLesson() {
  const { role, profile } = useAuth()

  if (role === 'admin' || role === 'owner') {
    return (
      <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          Панель модерации
        </h2>
        <p className="mt-2 text-slate-500">
          Проверяйте анкеты репетиторов и управляйте пользователями платформы.
        </p>
        <Link
          href="/dashboard/admin"
          className="mt-6 inline-flex rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white"
        >
          Открыть администрирование
        </Link>
      </section>
    )
  }

  const isTutor = role === 'tutor'
  const isPending = isTutor && profile?.status === 'pending'

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        <CalendarClock className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-900">
        {isPending ? 'Анкета на проверке' : 'Ближайшее занятие'}
      </h2>
      <p className="mt-2 text-slate-500">
        {isPending
          ? 'После одобрения профиль станет доступен студентам в каталоге.'
          : 'Запланированных занятий пока нет.'}
      </p>
      <Link
        href={isTutor ? '/dashboard/profile' : '/dashboard/tutors'}
        className="mt-6 inline-flex rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white"
      >
        {isTutor ? 'Открыть профиль' : 'Выбрать репетитора'}
      </Link>
    </section>
  )
}
