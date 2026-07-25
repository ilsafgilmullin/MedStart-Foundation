import Link from 'next/link'
import { CalendarClock } from 'lucide-react'

import { ROUTES } from '@/lib/constants'

export default function UpcomingLesson() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <CalendarClock className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-900">Ближайшее занятие</h2>
      <p className="mt-2 max-w-2xl leading-7 text-slate-500">
        Пока занятий нет. После записи здесь появятся дата, время и репетитор.
      </p>
      <Link
        href={ROUTES.TUTORS}
        className="mt-6 inline-flex rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700"
      >
        Выбрать репетитора
      </Link>
    </section>
  )
}
