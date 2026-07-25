'use client'

import Link from 'next/link'
import {
  CalendarDays,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

const studentActions = [
  {
    title: 'Найти репетитора',
    description: 'Открыть каталог специалистов',
    href: '/dashboard/tutors',
    icon: Search,
  },
  {
    title: 'Мои занятия',
    description: 'Посмотреть расписание',
    href: '/dashboard/schedule',
    icon: CalendarDays,
  },
  {
    title: 'Сообщения',
    description: 'Перейти к диалогам',
    href: '/dashboard/messages',
    icon: MessageCircle,
  },
  {
    title: 'Профиль',
    description: 'Изменить данные аккаунта',
    href: '/dashboard/profile',
    icon: UserRound,
  },
]

const tutorActions = [
  {
    title: 'Мои занятия',
    description: 'Посмотреть расписание',
    href: '/dashboard/schedule',
    icon: CalendarDays,
  },
  {
    title: 'Сообщения',
    description: 'Перейти к диалогам со студентами',
    href: '/dashboard/messages',
    icon: MessageCircle,
  },
  {
    title: 'Публичный профиль',
    description: 'Проверить данные анкеты',
    href: '/dashboard/profile',
    icon: UserRound,
  },
  {
    title: 'Настройки',
    description: 'Настроить аккаунт',
    href: '/dashboard/settings',
    icon: ShieldCheck,
  },
]

export default function QuickActions() {
  const { role } = useAuth()

  const actions =
    role === 'admin' || role === 'owner'
      ? [
          {
            title: 'Администрирование',
            description: 'Открыть панель модерации',
            href: '/dashboard/admin',
            icon: ShieldCheck,
          },
          ...tutorActions.slice(1),
        ]
      : role === 'tutor'
        ? tutorActions
        : studentActions

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Быстрые действия</h2>
        <p className="mt-1 text-slate-500">Основные разделы платформы.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
