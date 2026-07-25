import Link from 'next/link'
import { CalendarDays, MessageSquare, Search, UserRound } from 'lucide-react'

import { ROUTES } from '@/lib/constants'

const actions = [
  { title: 'Найти репетитора', description: 'Открыть каталог специалистов', href: ROUTES.TUTORS, icon: Search },
  { title: 'Расписание', description: 'Посмотреть будущие занятия', href: ROUTES.SCHEDULE, icon: CalendarDays },
  { title: 'Сообщения', description: 'Открыть переписку', href: ROUTES.MESSAGES, icon: MessageSquare },
  { title: 'Профиль', description: 'Изменить данные аккаунта', href: ROUTES.PROFILE, icon: UserRound },
]

export default function QuickActions() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Быстрые действия</h2>
        <p className="mt-1 text-slate-500">Основные разделы MedStart</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
