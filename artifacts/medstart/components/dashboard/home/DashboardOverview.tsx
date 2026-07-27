'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  FolderOpen,
  Inbox,
  MessageCircle,
  Search,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import BookingCard from '@/components/dashboard/BookingCard'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import { useAuth } from '@/hooks/useAuth'
import { subscribeToBookingsForUser } from '@/lib/bookings'
import { subscribeToConversations } from '@/lib/conversations'
import { bookingDateTime, type Booking, type Conversation } from '@/lib/domain'
import { subscribeToPublicTutors } from '@/lib/firestore'
import type { UserProfile } from '@/lib/user-profile'

interface ActionLink {
  title: string
  description: string
  href: string
  icon: typeof Search
}

function Stat({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string | number
  icon: typeof Search
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  )
}

function QuickActions({ items }: { items: ActionLink[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Быстрые действия</h2>
        <p className="mt-1 text-slate-500">
          Основные задачи доступны из одного рабочего пространства.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function DashboardOverview() {
  const { user, profile, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [tutors, setTutors] = useState<UserProfile[]>([])

  useEffect(() => {
    if (!user || !role || (role !== 'student' && role !== 'tutor')) return
    return subscribeToBookingsForUser(
      user.uid,
      role,
      setBookings,
      () => undefined,
    )
  }, [user, role])

  useEffect(() => {
    if (!user || (role !== 'student' && role !== 'tutor')) return
    return subscribeToConversations(user.uid, setConversations, () => undefined)
  }, [user, role])

  useEffect(() => {
    if (role !== 'student') return
    return subscribeToPublicTutors(setTutors, () => undefined)
  }, [role])

  const nextLesson = useMemo(
    () =>
      bookings
        .filter(
          (item) =>
            item.status === 'accepted' && bookingDateTime(item) >= Date.now(),
        )
        .sort(
          (left, right) => bookingDateTime(left) - bookingDateTime(right),
        )[0],
    [bookings],
  )

  if (role === 'owner' || role === 'admin') {
    return (
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Уровень доступа"
            value={role === 'owner' ? 'Владелец' : 'Админ'}
            icon={ShieldCheck}
          />
          <Stat title="Модерация" value="Доступна" icon={UserCheck} />
          <Stat title="Пользователи" value="Управление" icon={UsersRound} />
          <Stat title="Каталог" value="Контроль" icon={Search} />
        </section>
        <section className="rounded-[28px] border border-violet-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Центр управления MedStart
              </h2>
              <p className="mt-2 max-w-2xl text-slate-500">
                Проверяйте новые анкеты, контролируйте статусы пользователей и
                следите за активностью платформы.
              </p>
            </div>
            <Link
              href="/dashboard/admin"
              className="ms-btn ms-btn-primary shrink-0"
            >
              Открыть панель
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (role === 'tutor') {
    const pending = bookings.filter((item) => item.status === 'pending')
    const accepted = bookings.filter((item) => item.status === 'accepted')
    const completed = bookings.filter((item) => item.status === 'completed')
    const students = new Set(
      bookings
        .filter(
          (item) => item.status === 'accepted' || item.status === 'completed',
        )
        .map((item) => item.studentUid),
    )

    return (
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Новые заявки" value={pending.length} icon={Inbox} />
          <Stat
            title="Подтверждено"
            value={accepted.length}
            icon={CalendarDays}
          />
          <Stat title="Студенты" value={students.size} icon={UsersRound} />
          <Stat title="Завершено" value={completed.length} icon={UserCheck} />
        </section>

        {profile?.status === 'active' && pending.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Новые заявки
                </h2>
                <p className="mt-1 text-slate-500">
                  Ответьте студентам, чтобы заполнить расписание.
                </p>
              </div>
              <Link
                href="/dashboard/requests"
                className="hidden ms-link-action sm:flex"
              >
                Все заявки
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {pending.slice(0, 2).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  role="tutor"
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {nextLesson && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Ближайшее занятие
              </h2>
              <p className="mt-1 text-slate-500">
                Подтверждённая запись из вашего расписания.
              </p>
            </div>
            <div className="max-w-2xl">
              <BookingCard booking={nextLesson} role="tutor" compact />
            </div>
          </section>
        )}

        <QuickActions
          items={[
            {
              title: 'Заявки',
              description: 'Принять или отклонить',
              href: '/dashboard/requests',
              icon: Inbox,
            },
            {
              title: 'Расписание',
              description: 'Занятия и рабочие часы',
              href: '/dashboard/schedule',
              icon: CalendarDays,
            },
            {
              title: 'Студенты',
              description: 'Открыть список студентов',
              href: '/dashboard/students',
              icon: UsersRound,
            },
            {
              title: 'Материалы',
              description: 'Поделиться материалом',
              href: '/dashboard/materials',
              icon: FolderOpen,
            },
          ]}
        />
      </div>
    )
  }

  const pending = bookings.filter((item) => item.status === 'pending').length
  const completed = bookings.filter(
    (item) => item.status === 'completed',
  ).length
  const activeTutors = new Set(
    bookings
      .filter(
        (item) => item.status === 'accepted' || item.status === 'completed',
      )
      .map((item) => item.tutorUid),
  )

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Заявки на проверке" value={pending} icon={CalendarDays} />
        <Stat
          title="Мои репетиторы"
          value={activeTutors.size}
          icon={UserCheck}
        />
        <Stat
          title="Диалоги"
          value={conversations.length}
          icon={MessageCircle}
        />
        <Stat title="Завершено" value={completed} icon={UserCheck} />
      </section>

      {nextLesson && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Ближайшее занятие
            </h2>
            <p className="mt-1 text-slate-500">
              Репетитор подтвердил дату и время.
            </p>
          </div>
          <div className="max-w-2xl">
            <BookingCard booking={nextLesson} role="student" compact />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Рекомендуемые репетиторы
            </h2>
            <p className="mt-1 text-slate-500">
              Только проверенные профили из каталога.
            </p>
          </div>
          <Link
            href="/dashboard/tutors"
            className="hidden ms-link-action sm:flex"
          >
            Весь каталог
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {tutors.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tutors.slice(0, 3).map((tutor) => (
              <Link
                key={tutor.uid}
                href={`/dashboard/tutors/${tutor.uid}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  {tutor.avatar ? (
                    <ProfilePhoto
                      src={tutor.avatar}
                      size={48}
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 font-bold text-violet-700">
                      {tutor.firstName.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {tutor.displayName}
                    </p>
                    <p className="truncate text-sm text-violet-600">
                      {tutor.specialization || 'Медицинский репетитор'}
                    </p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                  {tutor.bio || 'Откройте профиль, чтобы узнать подробности.'}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-violet-300 bg-violet-50 p-8 text-center text-slate-600">
            Каталог пока пуст.
          </div>
        )}
      </section>

      <QuickActions
        items={[
          {
            title: 'Найти репетитора',
            description: 'Открыть каталог',
            href: '/dashboard/tutors',
            icon: Search,
          },
          {
            title: 'Мои занятия',
            description: 'Заявки и расписание',
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
            title: 'Материалы',
            description: 'Открыть материалы',
            href: '/dashboard/materials',
            icon: FolderOpen,
          },
        ]}
      />
    </div>
  )
}
