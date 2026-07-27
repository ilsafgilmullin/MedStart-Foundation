'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Star,
  Video,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import { subscribeToAvailability } from '@/lib/availability'
import { createBooking } from '@/lib/bookings'
import { WEEKDAYS, type TutorAvailability } from '@/lib/domain'
import { getPublicTutor } from '@/lib/firestore'
import type { LessonFormat, UserProfile } from '@/lib/user-profile'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100'

function today() {
  const current = new Date()
  const offset = current.getTimezoneOffset() * 60_000
  return new Date(current.getTime() - offset).toISOString().slice(0, 10)
}

export default function TutorProfilePage() {
  const params = useParams<{ tutorUid: string }>()
  const tutorUid = params.tutorUid
  const { profile, role } = useAuth()
  const [tutor, setTutor] = useState<UserProfile | null>(null)
  const [availability, setAvailability] = useState<TutorAvailability | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    conversationId: string
  } | null>(null)
  const [subject, setSubject] = useState('')
  const [goal, setGoal] = useState('')
  const [requestedDate, setRequestedDate] = useState('')
  const [requestedTime, setRequestedTime] = useState('')
  const [format, setFormat] = useState<LessonFormat>('online')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void getPublicTutor(tutorUid)
      .then((item) => {
        if (!active) return
        setTutor(item)
        setFormat(item?.lessonFormats?.[0] ?? 'online')
        setSubject(item?.subjects?.[0] ?? item?.specialization ?? '')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Не удалось открыть профиль репетитора.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tutorUid])

  useEffect(() => {
    if (!tutor) return
    return subscribeToAvailability(tutor.uid, setAvailability, () => undefined)
  }, [tutor])

  const activeDays = useMemo(
    () =>
      availability
        ? WEEKDAYS.filter((day) => availability.days[day.key].enabled)
        : [],
    [availability],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !tutor || role !== 'student') return
    setSubmitting(true)
    setError('')
    setSuccess(null)
    try {
      const result = await createBooking({
        student: profile,
        tutor,
        subject,
        goal,
        requestedDate,
        requestedTime,
        format,
        message,
      })
      setSuccess({ conversationId: result.conversationId })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось отправить заявку.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (!tutor) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Профиль недоступен
        </h1>
        <p className="mt-2 text-slate-600">
          Анкета могла быть снята с публикации.
        </p>
        <Link
          href="/dashboard/tutors"
          className="mt-6 ms-btn ms-btn-primary"
        >
          Вернуться в каталог
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/dashboard/tutors"
        className="ms-link-action text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Каталог репетиторов
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {tutor.avatar ? (
                <ProfilePhoto
                  src={tutor.avatar}
                  size={112}
                  className="h-28 w-28 rounded-3xl object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-violet-100 text-3xl font-bold text-violet-700">
                  {tutor.firstName.slice(0, 1)}
                  {tutor.lastName.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold text-slate-900">
                    {tutor.displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Проверен
                  </span>
                </div>
                <p className="mt-2 text-lg font-medium text-violet-700">
                  {tutor.specialization || 'Медицинский репетитор'}
                </p>
                {tutor.title && (
                  <p className="mt-1 text-slate-500">{tutor.title}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                  {tutor.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {tutor.city}
                    </span>
                  )}
                  {tutor.institution && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      {tutor.institution}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {tutor.reviewsCount
                      ? `${tutor.rating?.toFixed(1)} · отзывов ${tutor.reviewsCount}`
                      : 'Новый профиль'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Стоимость
                </p>
                <p className="mt-2 font-bold text-slate-900">
                  {tutor.lessonPrice
                    ? `${tutor.lessonPrice.toLocaleString('ru-RU')} ₽`
                    : 'По запросу'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Длительность
                </p>
                <p className="mt-2 font-bold text-slate-900">
                  {tutor.lessonDuration ?? 60} минут
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Опыт
                </p>
                <p className="mt-2 font-bold text-slate-900">
                  {tutor.experience || 'Не указан'}
                </p>
              </div>
            </div>

            {Boolean(tutor.subjects?.length) && (
              <div className="mt-7">
                <h2 className="font-bold text-slate-900">Предметы</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tutor.subjects!.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSubject(item)}
                      aria-pressed={subject === item}
                      className="ms-choice ms-choice-pill"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7">
              <h2 className="font-bold text-slate-900">О репетиторе</h2>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                {tutor.bio || 'Описание пока не заполнено.'}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-violet-600" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Обычное расписание
                </h2>
                <p className="text-sm text-slate-500">
                  Точное время подтверждает репетитор.
                </p>
              </div>
            </div>
            {activeDays.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {activeDays.map((day) => (
                  <div
                    key={day.key}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <span className="font-medium text-slate-700">
                      {day.label}
                    </span>
                    <span className="text-sm text-slate-500">
                      {availability!.days[day.key].start}–
                      {availability!.days[day.key].end}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Репетитор ещё не заполнил рабочие часы.
              </p>
            )}
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
            {success ? (
              <div className="py-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-2xl font-bold text-slate-900">
                  Заявка отправлена
                </h2>
                <p className="mt-2 text-slate-500">
                  Репетитор увидит её в своём кабинете. Диалог уже создан.
                </p>
                <div className="mt-6 grid gap-3">
                  <Link
                    href={`/dashboard/messages?conversation=${success.conversationId}`}
                    className="ms-btn ms-btn-primary"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Открыть диалог
                  </Link>
                  <Link
                    href="/dashboard/schedule"
                    className="ms-btn ms-btn-secondary"
                  >
                    Мои заявки
                  </Link>
                </div>
              </div>
            ) : role !== 'student' ? (
              <div className="py-6 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-violet-600" />
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Профиль репетитора
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Отправлять заявки могут аккаунты студентов.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-900">
                  Записаться на занятие
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Это заявка без оплаты. Репетитор подтвердит время в кабинете.
                </p>
                {error && (
                  <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    Предмет или тема
                    <input
                      className={inputClass}
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Например: анатомия"
                      required
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      Дата
                      <input
                        type="date"
                        min={today()}
                        className={inputClass}
                        value={requestedDate}
                        onChange={(event) =>
                          setRequestedDate(event.target.value)
                        }
                        required
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-slate-700">
                      Время
                      <input
                        type="time"
                        className={inputClass}
                        value={requestedTime}
                        onChange={(event) =>
                          setRequestedTime(event.target.value)
                        }
                        required
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Формат</p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {(tutor.lessonFormats?.length
                        ? tutor.lessonFormats
                        : (['online'] as LessonFormat[])
                      ).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFormat(item)}
                          aria-pressed={format === item}
                          className="ms-choice ms-choice-block"
                        >
                          {item === 'online' ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          {item === 'online' ? 'Онлайн' : 'Очно'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    Цель занятия
                    <textarea
                      className={`${inputClass} min-h-24 resize-y`}
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      placeholder="Что хотите разобрать?"
                    />
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    Первое сообщение
                    <textarea
                      className={`${inputClass} min-h-24 resize-y`}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Представьтесь и уточните задачу."
                    />
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <Clock3 className="h-5 w-5 shrink-0 text-violet-600" />
                    {tutor.lessonDuration ?? 60} минут ·{' '}
                    {tutor.lessonPrice
                      ? `${tutor.lessonPrice.toLocaleString('ru-RU')} ₽`
                      : 'стоимость уточняется'}
                  </div>
                  <button
                    disabled={submitting}
                    className="ms-btn ms-btn-primary ms-btn-lg ms-btn-block"
                  >
                    {submitting ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <CalendarDays className="h-5 w-5" />
                    )}
                    Отправить заявку
                  </button>
                </form>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
