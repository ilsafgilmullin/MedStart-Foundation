'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  Check,
  CircleCheckBig,
  ClipboardCheck,
  FileCheck2,
  FolderOpen,
  Inbox,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import BookingCard from '@/components/dashboard/BookingCard'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import { useAuth } from '@/hooks/useAuth'
import { subscribeToBookingsForUser } from '@/lib/bookings'
import { bookingDateTime, type Booking, type LearningMaterial } from '@/lib/domain'
import { subscribeToPublicTutors } from '@/lib/firestore'
import { subscribeToMaterialsForUser } from '@/lib/materials'
import type { UserProfile } from '@/lib/user-profile'

interface ActionLink {
  title: string
  description: string
  href: string
  icon: typeof Search
  tone?: 'teal' | 'blue' | 'amber' | 'violet'
}

const toneClasses = {
  teal: 'bg-teal-50 text-teal-700 ring-teal-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
}

function Stat({
  title,
  value,
  note,
  icon: Icon,
  tone = 'teal',
}: {
  title: string
  value: string | number
  note?: string
  icon: typeof Search
  tone?: keyof typeof toneClasses
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${toneClasses[tone]}`}>
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
        <h2 className="text-2xl font-black text-slate-950">Быстрые действия</h2>
        <p className="mt-1 text-slate-500">
          Продолжайте обучение с нужного шага.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ title, description, href, icon: Icon, tone = 'teal' }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${toneClasses[tone]}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {description}
                </p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function normalized(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function tutorMatchScore(tutor: UserProfile, profile: UserProfile | null) {
  if (!profile) return 0
  const targets = [
    ...(profile.subjects ?? []),
    profile.fieldOfStudy ?? '',
  ]
    .map(normalized)
    .filter(Boolean)
  const tutorText = [
    ...(tutor.subjects ?? []),
    tutor.specialization ?? '',
    tutor.bio ?? '',
  ]
    .map(normalized)
    .join(' ')
  return targets.reduce(
    (score, target) => score + (tutorText.includes(target) ? 1 : 0),
    0,
  )
}

const preparationSteps = [
  { id: 'goal', label: 'Сформулировать вопрос или цель занятия' },
  { id: 'materials', label: 'Подготовить конспект, снимок или задание' },
  { id: 'device', label: 'Проверить камеру, микрофон и интернет' },
]

export default function DashboardOverview() {
  const { user, profile, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [tutors, setTutors] = useState<UserProfile[]>([])
  const [preparationDone, setPreparationDone] = useState<string[]>([])

  useEffect(() => {
    if (!user || !role || (role !== 'student' && role !== 'tutor')) return
    return subscribeToBookingsForUser(user.uid, role, setBookings, () => undefined)
  }, [user, role])

  useEffect(() => {
    if (!user || !role || (role !== 'student' && role !== 'tutor')) return
    return subscribeToMaterialsForUser(user.uid, role, setMaterials, () => undefined)
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
        .sort((left, right) => bookingDateTime(left) - bookingDateTime(right))[0],
    [bookings],
  )

  useEffect(() => {
    if (!nextLesson || typeof window === 'undefined') {
      setPreparationDone([])
      return
    }
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(`medstart-prep-${nextLesson.id}`) || '[]',
      ) as string[]
      setPreparationDone(Array.isArray(saved) ? saved : [])
    } catch {
      setPreparationDone([])
    }
  }, [nextLesson])

  function togglePreparation(stepId: string) {
    if (!nextLesson) return
    setPreparationDone((current) => {
      const next = current.includes(stepId)
        ? current.filter((item) => item !== stepId)
        : [...current, stepId]
      window.localStorage.setItem(
        `medstart-prep-${nextLesson.id}`,
        JSON.stringify(next),
      )
      return next
    })
  }

  if (role === 'owner' || role === 'admin') {
    return (
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Уровень доступа"
            value={role === 'owner' ? 'Владелец' : 'Админ'}
            icon={ShieldCheck}
          />
          <Stat title="Модерация" value="Доступна" icon={UserCheck} tone="blue" />
          <Stat title="Пользователи" value="Управление" icon={UsersRound} tone="violet" />
          <Stat title="Каталог" value="Контроль" icon={Search} tone="amber" />
        </section>
        <section className="rounded-[28px] border border-teal-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Центр управления MedStart
              </h2>
              <p className="mt-2 max-w-2xl text-slate-500">
                Проверяйте новые анкеты, контролируйте статусы пользователей и
                следите за активностью платформы.
              </p>
            </div>
            <Link href="/dashboard/admin" className="ms-btn ms-btn-primary shrink-0">
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
        .filter((item) => item.status === 'accepted' || item.status === 'completed')
        .map((item) => item.studentUid),
    )

    return (
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Новые заявки" value={pending.length} icon={Inbox} tone="amber" />
          <Stat title="Подтверждено" value={accepted.length} icon={CalendarDays} />
          <Stat title="Студенты" value={students.size} icon={UsersRound} tone="blue" />
          <Stat title="Материалы" value={materials.length} icon={FileCheck2} tone="violet" />
        </section>

        {profile?.status === 'active' && pending.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Новые заявки</h2>
                <p className="mt-1 text-slate-500">
                  Ответьте студентам, чтобы заполнить расписание.
                </p>
              </div>
              <Link href="/dashboard/requests" className="hidden ms-link-action sm:flex">
                Все заявки
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {pending.slice(0, 2).map((booking) => (
                <BookingCard key={booking.id} booking={booking} role="tutor" compact />
              ))}
            </div>
          </section>
        )}

        {nextLesson && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Ближайшее занятие</h2>
              <p className="mt-1 text-slate-500">Подтверждённая запись из вашего расписания.</p>
            </div>
            <div className="max-w-2xl">
              <BookingCard booking={nextLesson} role="tutor" compact />
            </div>
          </section>
        )}

        <QuickActions
          items={[
            { title: 'Заявки', description: 'Принять или отклонить', href: '/dashboard/requests', icon: Inbox, tone: 'amber' },
            { title: 'Расписание', description: 'Занятия и рабочие часы', href: '/dashboard/schedule', icon: CalendarDays },
            { title: 'Студенты', description: 'Открыть список студентов', href: '/dashboard/students', icon: UsersRound, tone: 'blue' },
            { title: 'Материалы', description: 'Поделиться материалом', href: '/dashboard/materials', icon: FolderOpen, tone: 'violet' },
          ]}
        />
      </div>
    )
  }

  const pending = bookings.filter((item) => item.status === 'pending').length
  const completed = bookings.filter((item) => item.status === 'completed').length
  const upcoming = bookings.filter(
    (item) => item.status === 'accepted' && bookingDateTime(item) >= Date.now(),
  ).length
  const activeTutors = new Set(
    bookings
      .filter((item) => item.status === 'accepted' || item.status === 'completed')
      .map((item) => item.tutorUid),
  )
  const recommendedTutors = [...tutors]
    .sort((left, right) => {
      const score = tutorMatchScore(right, profile) - tutorMatchScore(left, profile)
      return score || (right.rating ?? 0) - (left.rating ?? 0)
    })
    .slice(0, 3)
  const focusSubjects = profile?.subjects?.filter(Boolean).slice(0, 5) ?? []
  const prepPercent = nextLesson
    ? Math.round((preparationDone.length / preparationSteps.length) * 100)
    : 0

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Ближайшие занятия" value={upcoming} note="Подтверждённые" icon={CalendarCheck2} />
        <Stat title="Заявки" value={pending} note="Ожидают ответа" icon={ClipboardCheck} tone="amber" />
        <Stat title="Материалы" value={materials.length} note="От преподавателей" icon={FolderOpen} tone="blue" />
        <Stat title="Завершено" value={completed} note={`Преподавателей: ${activeTutors.size}`} icon={CircleCheckBig} tone="violet" />
      </section>

      {nextLesson ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-slate-950">Ближайшее занятие</h2>
              <p className="mt-1 text-slate-500">Все данные и вход в комнату находятся в карточке.</p>
            </div>
            <BookingCard booking={nextLesson} role="student" compact />
          </div>
          <aside className="rounded-[28px] border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-teal-800">Подготовка к занятию</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{prepPercent}%</p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-teal-700 shadow-sm ring-1 ring-teal-100">
                <Check className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-teal-100">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${prepPercent}%` }} />
            </div>
            <div className="mt-5 space-y-2">
              {preparationSteps.map((step) => {
                const checked = preparationDone.includes(step.id)
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => togglePreparation(step.id)}
                    aria-pressed={checked}
                    className="ms-row-action w-full text-left"
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className={checked ? 'text-slate-400 line-through' : 'text-slate-700'}>{step.label}</span>
                  </button>
                )
              })}
            </div>
          </aside>
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-teal-300 bg-teal-50/70 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-teal-700">Следующий шаг</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Запланируйте первое занятие</h2>
              <p className="mt-2 max-w-2xl text-slate-600">Выберите тему, сравните преподавателей и отправьте заявку на удобное время.</p>
            </div>
            <Link href="/dashboard/tutors" className="ms-btn ms-btn-primary shrink-0">
              Найти преподавателя
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-teal-700">Мой учебный фокус</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Что изучаем сейчас</h2>
            </div>
            <Target className="h-6 w-6 text-teal-700" />
          </div>
          {focusSubjects.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {focusSubjects.map((subject) => (
                <span key={subject} className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-800 ring-1 ring-teal-100">{subject}</span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">Добавьте сложные дисциплины в профиль — каталог и учебная база будут подстраиваться под ваши задачи.</p>
          )}
          {profile?.bio && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{profile.bio}</p>}
          <Link href="/dashboard/profile" className="mt-5 ms-link-action">
            Настроить профиль обучения
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-sky-700">Учебная база</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Сохранённые источники</h2>
            </div>
            <BookOpenCheck className="h-6 w-6 text-sky-700" />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">Официальные книги, рекомендации и материалы преподавателей доступны отдельно от файлов конкретного занятия.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/dashboard/knowledge" className="ms-btn ms-btn-primary ms-btn-sm">Открыть базу</Link>
            <Link href="/dashboard/materials" className="ms-btn ms-btn-secondary ms-btn-sm">Мои материалы</Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Рекомендуемые преподаватели</h2>
            <p className="mt-1 text-slate-500">Сначала показываем профили, близкие к вашим дисциплинам.</p>
          </div>
          <Link href="/dashboard/tutors" className="hidden ms-link-action sm:flex">
            Весь каталог
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recommendedTutors.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendedTutors.map((tutor) => {
              const score = tutorMatchScore(tutor, profile)
              return (
                <Link
                  key={tutor.uid}
                  href={`/dashboard/tutors/${tutor.uid}`}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    {tutor.avatar ? (
                      <ProfilePhoto src={tutor.avatar} size={48} className="h-12 w-12 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 font-black text-teal-700">{tutor.firstName.slice(0, 1)}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-950">{tutor.displayName}</p>
                      <p className="truncate text-sm text-teal-700">{tutor.specialization || 'Медицинский преподаватель'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
                  </div>
                  {score > 0 && (
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      Совпадает с вашим запросом
                    </span>
                  )}
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{tutor.bio || 'Откройте профиль, чтобы узнать подробности.'}</p>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-teal-300 bg-teal-50 p-8 text-center text-slate-600">Каталог пока пуст.</div>
        )}
      </section>

      <QuickActions
        items={[
          { title: 'Найти преподавателя', description: 'Фильтры и персональные совпадения', href: '/dashboard/tutors', icon: Search },
          { title: 'Мои занятия', description: 'Заявки, подготовка и история', href: '/dashboard/schedule', icon: CalendarDays, tone: 'blue' },
          { title: 'Материалы', description: 'Файлы и задания от преподавателей', href: '/dashboard/materials', icon: FolderOpen, tone: 'violet' },
          { title: 'Учебная база', description: 'Официальные источники и избранное', href: '/dashboard/knowledge', icon: BookOpenCheck, tone: 'amber' },
        ]}
      />
    </div>
  )
}
