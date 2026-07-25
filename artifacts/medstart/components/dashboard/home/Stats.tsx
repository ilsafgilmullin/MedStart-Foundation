'use client'

import {
  CalendarDays,
  MessageCircle,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

export default function Stats() {
  const { role, profile } = useAuth()

  const items =
    role === 'tutor'
      ? [
          {
            title: 'Статус профиля',
            value: profile?.status === 'active' ? 'Активен' : 'На проверке',
            icon: UserCheck,
          },
          { title: 'Ученики', value: '0', icon: Users },
          { title: 'Занятия', value: '0', icon: CalendarDays },
          { title: 'Сообщения', value: '0', icon: MessageCircle },
        ]
      : role === 'admin' || role === 'owner'
        ? [
            { title: 'На модерации', value: '0', icon: ShieldCheck },
            { title: 'Репетиторы', value: '0', icon: UserCheck },
            { title: 'Студенты', value: '0', icon: Users },
            { title: 'Заявки', value: '0', icon: CalendarDays },
          ]
        : [
            { title: 'Выбранные репетиторы', value: '0', icon: Search },
            { title: 'Предстоящие занятия', value: '0', icon: CalendarDays },
            { title: 'Новые сообщения', value: '0', icon: MessageCircle },
            { title: 'Завершённые занятия', value: '0', icon: UserCheck },
          ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ title, value, icon: Icon }) => (
        <div
          key={title}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">{title}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
            </div>
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-600">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
