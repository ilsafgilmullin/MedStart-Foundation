'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Save,
  Search,
} from 'lucide-react'
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
  type Booking,
  type BookingStatus,
  type TutorAvailability,
} from '@/lib/domain'

type ActionStatus = Extract<
  BookingStatus,
  'accepted' | 'declined' | 'cancelled' | 'completed'
>

export default function SchedulePage() {
  const { user, profile, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<'lessons' | 'availability'>('lessons')
  const [filter, setFilter] = useState<'upcoming' | 'history'>('upcoming')
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
  const visibleBookings = useMemo(() => {
    if (role === 'tutor') {
      return bookings.filter((booking) =>
        filter === 'upcoming'
          ? booking.status === 'accepted'
          : ['completed', 'cancelled', 'declined'].includes(booking.status),
      )
    }
    if (role === 'student') {
      return bookings.filter((booking) =>
        filter === 'upcoming'
          ? booking.status === 'pending' || booking.status === 'accepted'
          : ['completed', 'cancelled', 'declined'].includes(booking.status),
      )
    }
    return bookings
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {role === 'tutor' ? 'Расписание' : 'Мои занятия'}
          </h1>
          <p className="mt-2 text-slate-500">
            {role === 'tutor'
              ? 'Подтверждённые занятия и ваши обычные рабочие часы.'
              : 'Следите за заявками и подтверждёнными занятиями.'}
          </p>
        </div>
        {role === 'student' && (
          <Link
            href="/dashboard/tutors"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white"
          >
            <Search className="h-5 w-5" />
            Найти репетитора
          </Link>
        )}
        {role === 'tutor' && pendingCount > 0 && (
          <Link
            href="/dashboard/requests"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-white"
          >
            Новые заявки
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              {pendingCount}
            </span>
          </Link>
        )}
      </div>

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
          <button
            type="button"
            onClick={() => setTab('lessons')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              tab === 'lessons'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Занятия
          </button>
          <button
            type="button"
            onClick={() => setTab('availability')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              tab === 'availability'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Рабочие часы
          </button>
        </div>
      )}

      {role === 'tutor' && tab === 'availability' ? (
        <section className="max-w-3xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <Clock3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Обычная доступность
              </h2>
              <p className="text-sm text-slate-500">
                Она отображается студентам в вашем профиле.
              </p>
            </div>
          </div>

          {availability ? (
            <div className="mt-6 space-y-3">
              {WEEKDAYS.map((day) => {
                const value = availability.days[day.key]
                return (
                  <div
                    key={day.key}
                    className="grid items-center gap-3 rounded-2xl border border-slate-100 p-4 sm:grid-cols-[160px_1fr]"
                  >
                    <label className="flex cursor-pointer items-center gap-3 font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={value.enabled}
                        onChange={(event) =>
                          updateDay(day.key, { enabled: event.target.checked })
                        }
                        className="h-5 w-5 accent-violet-600"
                      />
                      {day.label}
                    </label>
                    {value.enabled ? (
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <input
                          type="time"
                          value={value.start}
                          onChange={(event) =>
                            updateDay(day.key, { start: event.target.value })
                          }
                          className="min-w-0 rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <span className="text-slate-400">—</span>
                        <input
                          type="time"
                          value={value.end}
                          onChange={(event) =>
                            updateDay(day.key, { end: event.target.value })
                          }
                          className="min-w-0 rounded-xl border border-slate-200 px-3 py-2"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Выходной</span>
                    )}
                  </div>
                )
              })}
              <button
                type="button"
                onClick={() => void saveHours()}
                disabled={savingHours}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white disabled:opacity-60 sm:w-auto"
              >
                {savingHours ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
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
            <section className="rounded-[28px] bg-gradient-to-br from-violet-700 to-indigo-700 p-6 text-white shadow-lg">
              <p className="text-sm font-medium text-violet-100">
                Ближайшее подтверждённое занятие
              </p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{nextLesson.subject}</h2>
                  <p className="mt-2 text-violet-100">
                    {nextLesson.requestedDate} · {nextLesson.requestedTime}
                  </p>
                </div>
                <Link
                  href={
                    nextLesson.format === 'online'
                      ? ROUTES.LESSON(nextLesson.id)
                      : `/dashboard/messages?conversation=${nextLesson.conversationId}`
                  }
                  className="rounded-2xl bg-white px-5 py-3 text-center font-semibold text-violet-700"
                >
                  {nextLesson.format === 'online'
                    ? 'Войти в занятие'
                    : 'Открыть диалог'}
                </Link>
              </div>
            </section>
          )}

          {(role === 'student' || role === 'tutor') && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFilter('upcoming')}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  filter === 'upcoming'
                    ? 'bg-violet-600 text-white'
                    : 'bg-white text-slate-600'
                }`}
              >
                {role === 'tutor' ? 'Подтверждённые' : 'Текущие'}
              </button>
              <button
                type="button"
                onClick={() => setFilter('history')}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  filter === 'history'
                    ? 'bg-violet-600 text-white'
                    : 'bg-white text-slate-600'
                }`}
              >
                История
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <LoaderCircle className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : visibleBookings.length ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {visibleBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  role={role ?? 'student'}
                  busy={busyId === booking.id}
                  onAction={
                    role === 'student' || role === 'tutor'
                      ? (status) => void act(booking, status)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-violet-300 bg-violet-50 p-10 text-center">
              <CalendarDays className="mx-auto h-11 w-11 text-violet-600" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                {filter === 'history'
                  ? 'История пока пустая'
                  : 'Занятий пока нет'}
              </h2>
              <p className="mt-2 text-slate-500">
                {role === 'tutor'
                  ? 'Принятые заявки появятся здесь автоматически.'
                  : 'Выберите репетитора и предложите удобное время.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
