'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CopyCheck,
  CircleCheckBig,
  Clock3,
  History,
  Hourglass,
  LoaderCircle,
  Banknote,
  Save,
  Search,
  UsersRound,
}
 from 'lucide-react'
import BookingCard from '@/components/dashboard/BookingCard'
import { useAuth } from '@/hooks/useAuth'
import {
  emptyAvailability,
  saveAvailability,
  subscribeToAvailability,
} from '@/lib/availability'
import { changeBookingStatus, subscribeToBookingsForUser } from '@/lib/bookings'
import { ROUTES } from '@/lib/constants'
import {
  WEEKDAYS,
  bookingDateTime,
  formatBookingDate,
  type Booking,
  type BookingStatus,
  type TutorAvailability,
} from '@/lib/domain'

type ActionStatus = Extract<
  BookingStatus,
  'accepted' | 'declined' | 'cancelled' | 'completed'
>
type StudentFilter = 'upcoming' | 'pending' | 'history'

function twoDigits(value: number) {
  return String(value).padStart(2, '0')
}

function calendarDate(value: number) {
  const date = new Date(value)
  return `${date.getUTCFullYear()}${twoDigits(date.getUTCMonth() + 1)}${twoDigits(date.getUTCDate())}T${twoDigits(date.getUTCHours())}${twoDigits(date.getUTCMinutes())}00Z`
}

function escapeCalendarText(value: string) {
  return value.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

function downloadCalendarEvent(booking: Booking) {
  const start = bookingDateTime(booking)
  if (!start) return
  const end = start + booking.durationMinutes * 60_000
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedStart//Lesson//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@medstart`,
    `DTSTAMP:${calendarDate(Date.now())}`,
    `DTSTART:${calendarDate(start)}`,
    `DTEND:${calendarDate(end)}`,
    `SUMMARY:${escapeCalendarText(`MedStart: ${booking.subject}`)}`,
    `DESCRIPTION:${escapeCalendarText(`Предмет: ${booking.subject}. Студент: ${booking.studentName}. Преподаватель: ${booking.tutorName}. ${booking.goal || ''}`)}`, 
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/calendar;charset=utf-8' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `medstart-${booking.requestedDate || booking.id}.ics`
  anchor.click()
  URL.revokeObjectURL(url)
}

function SummaryCard({
  title,
  value,
  note,
  icon: Icon,
  tone,
}: {
  title: string
  value: number
  note: string
  icon: typeof CalendarDays
  tone: 'teal' | 'amber' | 'violet'
}) {
  const toneClass =
    tone === 'teal'
      ? 'bg-teal-50 text-teal-700 ring-teal-100'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : 'bg-violet-50 text-violet-700 ring-violet-100'
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{note}</p>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  )
}

export default function SchedulePage() {
  const { user, profile, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<'lessons' | 'availability'>('lessons')
  const [filter, setFilter] = useState<StudentFilter>('upcoming')
  const [availability, setAvailability] = useState<TutorAvailability | null>(
    null,
  )
  const [savingHours, setSavingHours] = useState(false)

  useEffect(() => {
    if (!user || !role) return
    return subscribeToBookingsForUser(
      user.uid,
      role,
      (items) => {
        setBookings(items)
        setLoading(false)
        setError('')
      },
      () => {
        setError('Не удалось загрузить занятия.')
        setLoading(false)
      },
    )
  }, [user, role])

  useEffect(() => {
    if (!user || role !== 'tutor') return
    return subscribeToAvailability(user.uid, setAvailability, () =>
      setAvailability(
        emptyAvailability(user.uid, profile?.timezone || 'Europe/Moscow'),
      ),
    )
  }, [user, role, profile?.timezone])

  const pendingCount = bookings.filter(
    (booking) => booking.status === 'pending',
  ).length
  const upcomingCount = bookings.filter(
    (booking) =>
      booking.status === 'accepted' && bookingDateTime(booking) >= Date.now(),
  ).length
  const completedCount = bookings.filter(
    (booking) => booking.status === 'completed',
  ).length
  const weekEnd = Date.now() + 7 * 24 * 60 * 60 * 1000
  const weekCount = bookings.filter(
    (booking) =>
      booking.status === 'accepted' &&
      bookingDateTime(booking) >= Date.now() &&
      bookingDateTime(booking) <= weekEnd,
  ).length
  const activeStudents = new Set(
    bookings
      .filter(
        (booking) =>
          booking.status === 'accepted' || booking.status === 'completed',
      )
      .map((booking) => booking.studentUid),
  ).size
  const completedValue = bookings
    .filter((booking) => booking.status === 'completed')
    .reduce((sum, booking) => sum + Math.max(0, Number(booking.price) || 0), 0)
  const enabledDays = availability
    ? WEEKDAYS.filter((day) => availability.days[day.key].enabled).length
    : 0
  const weeklyHours = availability
    ? WEEKDAYS.reduce((sum, day) => {
        const value = availability.days[day.key]
        if (!value.enabled) return sum
        const [startHour, startMinute] = value.start.split(':').map(Number)
        const [endHour, endMinute] = value.end.split(':').map(Number)
        const minutes =
          endHour * 60 + endMinute - (startHour * 60 + startMinute)
        return sum + Math.max(0, minutes) / 60
      }, 0)
    : 0

  const visibleBookings = useMemo(() => {
    const selected = bookings.filter((booking) => {
      if (role === 'tutor') {
        return filter === 'history'
          ? ['completed', 'cancelled', 'declined'].includes(booking.status)
          : booking.status === 'accepted'
      }
      if (role === 'student') {
        if (filter === 'pending') return booking.status === 'pending'
        if (filter === 'history') {
          return ['completed', 'cancelled', 'declined'].includes(booking.status)
        }
        return booking.status === 'accepted'
      }
      return true
    })
    return selected.sort((left, right) => {
      const direction = filter === 'history' ? -1 : 1
      return direction * (bookingDateTime(left) - bookingDateTime(right))
    })
  }, [bookings, filter, role])

  const nextLesson = bookings
    .filter(
      (booking) =>
        booking.status === 'accepted' && bookingDateTime(booking) >= Date.now(),
    )
    .sort((left, right) => bookingDateTime(left) - bookingDateTime(right))[0]

  async function act(booking: Booking, status: ActionStatus) {
    if (!user) return
    if (
      status === 'cancelled' &&
      !window.confirm('Отменить эту запись на занятие?')
    ) {
      return
    }
    if (
      status === 'completed' &&
      !window.confirm('Отметить занятие как завершённое?')
    ) {
      return
    }
    let response = ''
    if (status === 'accepted') {
      response =
        window.prompt(
          'Короткий ответ студенту (можно оставить пустым):',
          'Заявка принята. До встречи на занятии!',
        ) ?? ''
    }

    setBusyId(booking.id)
    setError('')
    setMessage('')
    try {
      await changeBookingStatus({
        bookingId: booking.id,
        actorUid: user.uid,
        nextStatus: status,
        response,
      })
      setMessage(
        status === 'accepted'
          ? 'Занятие подтверждено.'
          : status === 'completed'
            ? 'Занятие отмечено как завершённое.'
            : 'Статус занятия обновлён.',
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось обновить запись.',
      )
    } finally {
      setBusyId(null)
    }
  }

  function updateDay(
    day: keyof TutorAvailability['days'],
    patch: Partial<TutorAvailability['days'][typeof day]>,
  ) {
    setAvailability((current) => {
      if (!current) return current
      return {
        ...current,
        days: {
          ...current.days,
          [day]: { ...current.days[day], ...patch },
        },
      }
    })
  }

  function applyAvailabilityTemplate(
    template: 'weekdays' | 'evenings' | 'clear',
  ) {
    setAvailability((current) => {
      if (!current) return current
      const next = { ...current.days }
      for (const day of WEEKDAYS) {
        const weekend = day.key === 'saturday' || day.key === 'sunday'
        next[day.key] =
          template === 'clear'
            ? { enabled: false, start: '09:00', end: '18:00' }
            : template === 'weekdays'
              ? { enabled: !weekend, start: '09:00', end: '18:00' }
              : { enabled: !weekend, start: '17:00', end: '21:00' }
      }
      return { ...current, days: next }
    })
  }

  async function saveHours() {
    if (!availability) return
    setSavingHours(true)
    setError('')
    setMessage('')
    try {
      await saveAvailability(availability)
      setMessage('Рабочие часы сохранены.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось сохранить рабочие часы.',
      )
    } finally {
      setSavingHours(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">
            {role === 'tutor' ? 'Расписание' : 'Мои занятия'}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            {role === 'tutor'
              ? 'Подтверждённые занятия и ваши обычные рабочие часы.'
              : 'Заявки, подтверждённые встречи, подготовка и история обучения.'}
          </p>
        </div>
        {role === 'student' && (
          <Link href="/dashboard/tutors" className="ms-btn ms-btn-primary">
            <Search className="h-5 w-5" />
            Найти преподавателя
          </Link>
        )}
        {role === 'tutor' && pendingCount > 0 && (
          <Link href="/dashboard/requests" className="ms-btn ms-btn-soft">
            Новые заявки
            <span className="rounded-full bg-white px-2 py-0.5 text-teal-800">
              {pendingCount}
            </span>
          </Link>
        )}
      </header>

      {role === 'student' && (
        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard title="Подтверждено" value={upcomingCount} note="Будущие занятия" icon={CalendarCheck2} tone="teal" />
          <SummaryCard title="Ожидают ответа" value={pendingCount} note="Отправленные заявки" icon={Hourglass} tone="amber" />
          <SummaryCard title="Завершено" value={completedCount} note="История обучения" icon={CircleCheckBig} tone="violet" />
        </section>
      )}

      {role === 'tutor' && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Предстоящие" value={upcomingCount} note={`На 7 дней: ${weekCount}`} icon={CalendarCheck2} tone="teal" />
          <SummaryCard title="Новые заявки" value={pendingCount} note="Требуют решения" icon={Hourglass} tone="amber" />
          <SummaryCard title="Студенты" value={activeStudents} note={`Завершено: ${completedCount}`} icon={UsersRound} tone="violet" />
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Сумма проведённых</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{completedValue.toLocaleString('ru-RU')} ₽</p>
                <p className="mt-1 text-xs text-slate-400">По стоимости занятий</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 ring-1 ring-sky-100">
                <Banknote className="h-5 w-5" />
              </div>
            </div>
          </article>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {role === 'tutor' && (
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          <button type="button" onClick={() => setTab('lessons')} aria-pressed={tab === 'lessons'} className="ms-choice ms-choice-block">
            Занятия
          </button>
          <button type="button" onClick={() => setTab('availability')} aria-pressed={tab === 'availability'} className="ms-choice ms-choice-block">
            Рабочие часы
          </button>
        </div>
      )}

      {role === 'tutor' && tab === 'availability' ? (
        <section className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
              <Clock3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Обычная доступность</h2>
              <p className="text-sm text-slate-500">Она отображается студентам в вашем профиле.</p>
            </div>
          </div>

          {availability ? (
            <div className="mt-6 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Рабочих дней</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{enabledDays}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-sky-700">Часов в неделю</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{weeklyHours.toFixed(1)}</p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-violet-700">Часовой пояс</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">{availability.timezone}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-600">
                  <CopyCheck className="h-4 w-4 text-teal-700" />
                  Быстрый шаблон:
                </span>
                <button type="button" onClick={() => applyAvailabilityTemplate('weekdays')} className="ms-btn ms-btn-secondary ms-btn-sm">Будни 09–18</button>
                <button type="button" onClick={() => applyAvailabilityTemplate('evenings')} className="ms-btn ms-btn-secondary ms-btn-sm">Вечера 17–21</button>
                <button type="button" onClick={() => applyAvailabilityTemplate('clear')} className="ms-btn ms-btn-soft ms-btn-sm">Очистить</button>
              </div>
              {WEEKDAYS.map((day) => {
                const value = availability.days[day.key]
                return (
                  <div key={day.key} className="grid items-center gap-3 rounded-2xl border border-slate-100 p-4 sm:grid-cols-[160px_1fr]">
                    <label className="flex cursor-pointer items-center gap-3 font-semibold text-slate-700">
                      <input type="checkbox" checked={value.enabled} onChange={(event) => updateDay(day.key, { enabled: event.target.checked })} className="h-5 w-5 accent-teal-700" />
                      {day.label}
                    </label>
                    {value.enabled ? (
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <input type="time" value={value.start} onChange={(event) => updateDay(day.key, { start: event.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2" />
                        <span className="text-slate-400">—</span>
                        <input type="time" value={value.end} onChange={(event) => updateDay(day.key, { end: event.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2" />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Выходной</span>
                    )}
                  </div>
                )
              })}
              <button type="button" onClick={() => void saveHours()} disabled={savingHours} className="mt-3 ms-btn ms-btn-primary ms-btn-lg ms-btn-block sm:w-auto">
                {savingHours ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Сохранить часы
              </button>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Загружаем расписание…
            </div>
          )}
        </section>
      ) : (
        <>
          {nextLesson && filter === 'upcoming' && (
            <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-lg">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-sm font-bold text-cyan-100">Ближайшее подтверждённое занятие</p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">{nextLesson.subject}</h2>
                  <p className="mt-2 text-teal-50/85">{formatBookingDate(nextLesson)} · {nextLesson.durationMinutes} минут</p>
                  <p className="mt-3 text-sm text-teal-50/75">
                    {role === 'tutor' ? `Студент: ${nextLesson.studentName}` : `Преподаватель: ${nextLesson.tutorName}`}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => downloadCalendarEvent(nextLesson)} className="ms-btn ms-btn-on-dark">
                    <CalendarPlus className="h-4 w-4" />
                    В календарь
                  </button>
                  <Link
                    href={nextLesson.format === 'online' ? ROUTES.LESSON(nextLesson.id) : `/dashboard/messages?conversation=${nextLesson.conversationId}`}
                    className="ms-btn ms-btn-white"
                  >
                    {nextLesson.format === 'online' ? 'Войти в занятие' : 'Открыть диалог'}
                  </Link>
                </div>
              </div>
            </section>
          )}

          {(role === 'student' || role === 'tutor') && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setFilter('upcoming')} aria-pressed={filter === 'upcoming'} className="ms-choice ms-choice-pill shrink-0">
                <CalendarDays className="h-4 w-4" />
                {role === 'tutor' ? 'Подтверждённые' : 'Предстоящие'}
                {upcomingCount > 0 && <span>{upcomingCount}</span>}
              </button>
              {role === 'student' && (
                <button type="button" onClick={() => setFilter('pending')} aria-pressed={filter === 'pending'} className="ms-choice ms-choice-pill shrink-0">
                  <Hourglass className="h-4 w-4" />
                  Ожидают ответа
                  {pendingCount > 0 && <span>{pendingCount}</span>}
                </button>
              )}
              <button type="button" onClick={() => setFilter('history')} aria-pressed={filter === 'history'} className="ms-choice ms-choice-pill shrink-0">
                <History className="h-4 w-4" />
                История
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <LoaderCircle className="h-8 w-8 animate-spin text-teal-700" />
            </div>
          ) : visibleBookings.length ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {visibleBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  role={role ?? 'student'}
                  busy={busyId === booking.id}
                  onAction={role === 'student' || role === 'tutor' ? (status) => void act(booking, status) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-teal-300 bg-teal-50 p-10 text-center">
              <CalendarDays className="mx-auto h-11 w-11 text-teal-700" />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                {filter === 'history'
                  ? 'История пока пустая'
                  : filter === 'pending'
                    ? 'Заявок на рассмотрении нет'
                    : 'Предстоящих занятий нет'}
              </h2>
              <p className="mt-2 text-slate-500">
                {role === 'tutor'
                  ? 'Принятые заявки появятся здесь автоматически.'
                  : filter === 'pending'
                    ? 'Новые заявки появятся здесь после записи к преподавателю.'
                    : 'Выберите преподавателя и предложите удобное время.'}
              </p>
              {role === 'student' && filter !== 'history' && (
                <Link href="/dashboard/tutors" className="mt-5 ms-btn ms-btn-primary">
                  Найти преподавателя
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
