'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  Inbox,
  LoaderCircle,
  Search,
  Send,
  UserRound,
  X,
} from 'lucide-react'
import BookingCard from '@/components/dashboard/BookingCard'
import { useAuth } from '@/hooks/useAuth'
import { changeBookingStatus, subscribeToBookingsForUser } from '@/lib/bookings'
import {
  bookingDateTime,
  timestampToMillis,
  type Booking,
} from '@/lib/domain'

type Decision = 'accepted' | 'declined'
type SortMode = 'oldest' | 'newest' | 'date'

const responseTemplates = {
  accepted: [
    'Заявка принята. До встречи на занятии!',
    'Время подходит. Перед занятием пришлите, пожалуйста, вопросы и материалы.',
    'Подтверждаю занятие. Подключайтесь за 5 минут до начала.',
  ],
  declined: [
    'К сожалению, это время занято. Напишите в сообщениях, чтобы выбрать другое.',
    'Не смогу провести занятие в указанное время. Предложите, пожалуйста, другой день.',
    'Сейчас не беру новые занятия по этой теме. Спасибо за обращение.',
  ],
} as const

function requestAge(booking: Booking) {
  const created = timestampToMillis(booking.createdAt)
  if (!created) return 'Недавно'
  const hours = Math.max(0, Math.floor((Date.now() - created) / 3_600_000))
  if (hours < 1) return 'Менее часа назад'
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`
}

function overlaps(left: Booking, right: Booking) {
  const leftStart = bookingDateTime(left)
  const rightStart = bookingDateTime(right)
  if (!leftStart || !rightStart) return false
  const leftEnd = leftStart + left.durationMinutes * 60_000
  const rightEnd = rightStart + right.durationMinutes * 60_000
  return leftStart < rightEnd && rightStart < leftEnd
}

export default function TutorRequestsPage() {
  const { user, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('all')
  const [sort, setSort] = useState<SortMode>('oldest')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [decision, setDecision] = useState<Decision>('accepted')
  const [response, setResponse] = useState('')

  useEffect(() => {
    if (!user || role !== 'tutor') {
      setLoading(false)
      return
    }
    return subscribeToBookingsForUser(
      user.uid,
      role,
      (items) => {
        setBookings(items)
        setLoading(false)
        setError('')
      },
      () => {
        setError('Не удалось загрузить заявки.')
        setLoading(false)
      },
    )
  }, [user, role])

  const pending = useMemo(
    () => bookings.filter((item) => item.status === 'pending'),
    [bookings],
  )
  const accepted = useMemo(
    () => bookings.filter((item) => item.status === 'accepted'),
    [bookings],
  )
  const subjects = useMemo(
    () => [...new Set(pending.map((item) => item.subject).filter(Boolean))].sort(),
    [pending],
  )
  const conflictIds = useMemo(() => {
    const result = new Set<string>()
    for (const request of pending) {
      if (accepted.some((lesson) => overlaps(request, lesson))) result.add(request.id)
    }
    return result
  }, [accepted, pending])

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    const filtered = pending.filter((item) => {
      const text = `${item.studentName} ${item.subject} ${item.goal} ${item.studentMessage}`.toLocaleLowerCase('ru-RU')
      return (
        (!normalized || text.includes(normalized)) &&
        (subject === 'all' || item.subject === subject)
      )
    })
    return filtered.sort((left, right) => {
      if (sort === 'date') return bookingDateTime(left) - bookingDateTime(right)
      const leftCreated = timestampToMillis(left.createdAt)
      const rightCreated = timestampToMillis(right.createdAt)
      return sort === 'newest'
        ? rightCreated - leftCreated
        : leftCreated - rightCreated
    })
  }, [pending, query, sort, subject])

  const requestValue = pending.reduce(
    (sum, item) => sum + Math.max(0, Number(item.price) || 0),
    0,
  )
  const uniqueStudents = new Set(pending.map((item) => item.studentUid)).size

  function openDecision(booking: Booking, nextDecision: Decision) {
    setSelected(booking)
    setDecision(nextDecision)
    setResponse(responseTemplates[nextDecision][0])
    setError('')
    setMessage('')
    window.setTimeout(() => {
      document.getElementById('request-decision')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 0)
  }

  async function submitDecision() {
    if (!user || !selected) return
    if (decision === 'declined' && !response.trim()) {
      setError('Укажите причину отклонения — студент увидит этот ответ.')
      return
    }
    setBusyId(selected.id)
    setError('')
    setMessage('')
    try {
      await changeBookingStatus({
        bookingId: selected.id,
        actorUid: user.uid,
        nextStatus: decision,
        response: response.trim(),
      })
      setMessage(
        decision === 'accepted'
          ? `Занятие с ${selected.studentName} подтверждено.`
          : `Студенту ${selected.studentName} отправлен ответ.`,
      )
      setSelected(null)
      setResponse('')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось обработать заявку.',
      )
    } finally {
      setBusyId(null)
    }
  }

  if (role !== 'tutor') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        Этот раздел доступен только репетиторам.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/15">
              <Inbox className="h-4 w-4 text-cyan-200" />
              Центр заявок
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              Заявки студентов
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50/80 sm:text-base">
              Оцените цель занятия, проверьте время и отправьте студенту
              профессиональный ответ без перехода в другие разделы.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-sm font-bold text-white">Нужен ответ</p>
            <p className="mt-1 text-3xl font-black text-cyan-100">{pending.length}</p>
            <p className="mt-1 text-xs text-teal-50/70">
              Конфликтов по времени: {conflictIds.size}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Новые заявки', pending.length, Inbox, 'text-amber-700 bg-amber-50'],
          ['Студенты', uniqueStudents, UserRound, 'text-sky-700 bg-sky-50'],
          ['Потенциальная сумма', `${requestValue.toLocaleString('ru-RU')} ₽`, Banknote, 'text-violet-700 bg-violet-50'],
          ['Пересечения', conflictIds.size, CalendarClock, 'text-red-700 bg-red-50'],
        ].map(([title, value, Icon, tone]) => {
          const IconComponent = Icon as typeof Inbox
          return (
            <article key={String(title)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{String(title)}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{String(value)}</p>
                </div>
                <span className={`rounded-2xl p-3 ${String(tone)}`}>
                  <IconComponent className="h-5 w-5" />
                </span>
              </div>
            </article>
          )
        })}
      </section>

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

      {selected && (
        <section id="request-decision" className="rounded-[28px] border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-teal-700">
                Ответ студенту
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {decision === 'accepted' ? 'Подтвердить занятие' : 'Отклонить заявку'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {selected.studentName} · {selected.subject}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="ms-icon-btn ms-icon-btn-neutral" aria-label="Закрыть">
              <X className="h-5 w-5" />
            </button>
          </div>

          {conflictIds.has(selected.id) && decision === 'accepted' && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                На это время уже есть подтверждённое занятие. Проверьте расписание перед принятием.
              </p>
            </div>
          )}

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {responseTemplates[decision].map((template, index) => (
              <button key={template} type="button" onClick={() => setResponse(template)} aria-pressed={response === template} className="ms-choice ms-choice-pill shrink-0">
                Шаблон {index + 1}
              </button>
            ))}
          </div>
          <label className="mt-4 block space-y-2 text-sm font-bold text-slate-700">
            Сообщение
            <textarea
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              maxLength={1000}
              className="min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              placeholder="Напишите короткий и понятный ответ студенту."
            />
            <span className="block text-right text-xs font-medium text-slate-400">
              {response.length}/1000
            </span>
          </label>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setSelected(null)} className="ms-btn ms-btn-secondary">
              Отмена
            </button>
            <button
              type="button"
              onClick={() => void submitDecision()}
              disabled={busyId === selected.id}
              className={decision === 'accepted' ? 'ms-btn ms-btn-primary' : 'ms-btn ms-btn-danger'}
            >
              {busyId === selected.id ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {decision === 'accepted' ? 'Подтвердить занятие' : 'Отправить отказ'}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Студент, предмет, цель занятия"
              className="w-full rounded-2xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <label className="relative">
            <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full appearance-none rounded-2xl border border-slate-200 py-3 pl-11 pr-4 font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
              <option value="all">Все предметы</option>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-2xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
            <option value="oldest">Сначала старые</option>
            <option value="newest">Сначала новые</option>
            <option value="date">По дате занятия</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      ) : visible.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {visible.map((booking) => (
            <div key={booking.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-1 text-xs font-bold text-slate-500">
                <span>{requestAge(booking)}</span>
                {conflictIds.has(booking.id) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Пересечение по времени
                  </span>
                )}
              </div>
              <BookingCard
                booking={booking}
                role="tutor"
                busy={busyId === booking.id}
                onAction={(status) => {
                  if (status === 'accepted' || status === 'declined') {
                    openDecision(booking, status)
                  }
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-teal-300 bg-teal-50 p-10 text-center">
          <Inbox className="mx-auto h-11 w-11 text-teal-700" />
          <h2 className="mt-4 text-xl font-black text-slate-950">
            {pending.length ? 'По выбранным фильтрам ничего нет' : 'Новых заявок нет'}
          </h2>
          <p className="mt-2 text-slate-500">
            {pending.length
              ? 'Измените запрос или сбросьте фильтры.'
              : 'Новые заявки появятся здесь сразу после записи студента.'}
          </p>
          {pending.length > 0 && (
            <button type="button" onClick={() => { setQuery(''); setSubject('all') }} className="mt-5 ms-btn ms-btn-secondary">
              Сбросить фильтры
            </button>
          )}
        </div>
      )}
    </div>
  )
}
