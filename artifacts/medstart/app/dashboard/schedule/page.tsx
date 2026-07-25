'use client'

import Link from 'next/link'
import { CalendarDays, Search } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

export default function SchedulePage() {
  const { role } = useAuth()
  const isTutor = role === 'tutor'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Мои занятия</h1>
        <p className="mt-2 text-slate-500">
          Здесь появятся подтверждённые и завершённые занятия.
        </p>
      </div>

      <section className="rounded-[32px] border border-dashed border-violet-300 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-600">
          <CalendarDays className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          Занятий пока нет
        </h2>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
          {isTutor
            ? 'После подтверждения заявки студента дата и время автоматически появятся в расписании.'
            : 'После записи к репетитору дата и время автоматически появятся в расписании.'}
        </p>

        {!isTutor && (
          <Link
            href="/dashboard/tutors"
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-semibold text-white"
          >
            <Search className="h-4 w-4" />
            Найти репетитора
          </Link>
        )}
      </section>
    </div>
  )
}
