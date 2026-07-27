'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  AudioLines,
  CalendarDays,
  Clock3,
  LoaderCircle,
  MonitorUp,
  ShieldCheck,
  Video,
  Wifi,
} from 'lucide-react'
import type { LiveSessionCredentials } from '@/components/live/LiveLessonRoom'
import { useAuth } from '@/hooks/useAuth'
import { getBooking } from '@/lib/bookings'
import { ROUTES } from '@/lib/constants'
import { formatBookingDate, type Booking } from '@/lib/domain'

type JoinMode = 'video' | 'audio'

function RoomLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <LoaderCircle className="h-5 w-5 animate-spin text-violet-300" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  )
}

const DemoLessonRoom = dynamic(
  () => import('@/components/live/DemoLessonRoom'),
  {
    ssr: false,
    loading: () => <RoomLoader label="Открываем медицинскую доску…" />,
  },
)

const LiveLessonRoom = dynamic(
  () => import('@/components/live/LiveLessonRoom'),
  {
    ssr: false,
    loading: () => <RoomLoader label="Подключаем защищённую комнату…" />,
  },
)

export default function LessonPage() {
  const params = useParams<{ bookingId: string }>()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<JoinMode | null>(null)
  const [credentials, setCredentials] = useState<LiveSessionCredentials | null>(
    null,
  )
  const [joinWithVideo, setJoinWithVideo] = useState(true)
  const [error, setError] = useState('')

  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : ''

  useEffect(() => {
    if (authLoading) return
    if (!user || !profile) {
      router.replace(ROUTES.LOGIN)
      return
    }

    let active = true
    setLoading(true)
    void getBooking(bookingId)
      .then((next) => {
        if (!active) return
        if (!next) {
          setError('Занятие не найдено.')
          return
        }
        if (user.uid !== next.studentUid && user.uid !== next.tutorUid) {
          setError('У вас нет доступа к этому занятию.')
          return
        }
        if (next.status !== 'accepted') {
          setError('Онлайн-комната откроется после подтверждения занятия.')
          return
        }
        if (next.format !== 'online') {
          setError('Это занятие запланировано в очном формате.')
          return
        }
        setBooking(next)
      })
      .catch(() => setError('Не удалось загрузить занятие.'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authLoading, bookingId, profile, router, user])

  async function join(mode: JoinMode) {
    if (!user || !booking) return
    setJoining(mode)
    setError('')

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15_000)

    try {
      const idToken = await user.getIdToken()
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: booking.id }),
        signal: controller.signal,
      })
      const payload = (await response.json()) as
        | LiveSessionCredentials
        | { error?: string }

      if (!response.ok || !('participantToken' in payload)) {
        throw new Error(
          'error' in payload && payload.error
            ? payload.error
            : 'Не удалось открыть комнату занятия.',
        )
      }

      setJoinWithVideo(mode === 'video')
      setCredentials(payload)
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === 'AbortError'
          ? 'Подготовка комнаты заняла слишком много времени. Повторите попытку.'
          : caught instanceof Error
            ? caught.message
            : 'Не удалось открыть комнату занятия.',
      )
    } finally {
      window.clearTimeout(timeout)
      setJoining(null)
    }
  }

  function leave() {
    router.replace(ROUTES.SCHEDULE)
  }

  if (credentials && booking && user && profile) {
    const participantRole = user.uid === booking.tutorUid ? 'tutor' : 'student'

    // В бесплатном режиме не загружаем LiveKit-клиент вообще. Это устраняет
    // зависание Safari на этапе импорта/подключения видеобиблиотеки.
    if (credentials.serverUrl === 'demo://local') {
      return (
        <DemoLessonRoom
          booking={booking}
          userUid={user.uid}
          userName={profile.displayName}
          participantRole={participantRole}
          onLeave={leave}
        />
      )
    }

    return (
      <>
        <LiveLessonRoom
          booking={booking}
          credentials={credentials}
          userUid={user.uid}
          userName={profile.displayName}
          participantRole={participantRole}
          joinWithVideo={joinWithVideo}
          onLeave={leave}
          onConnectionError={setError}
        />
        {error && (
          <div className="fixed left-1/2 top-20 z-[100] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-950/95 p-4 text-sm text-amber-100 shadow-2xl backdrop-blur">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError('')}
              className="ms-btn ms-btn-on-dark ms-btn-sm"
            >
              Закрыть
            </button>
          </div>
        )}
      </>
    )
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-violet-300" />
          <span className="text-sm font-semibold">Готовим занятие…</span>
        </div>
      </main>
    )
  }

  if (!booking) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-5 text-white">
        <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-7 text-center shadow-2xl">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-5 text-2xl font-bold">Комната недоступна</h1>
          <p className="mt-3 leading-7 text-slate-300">
            {error || 'Проверьте статус занятия в расписании.'}
          </p>
          <Link
            href={ROUTES.SCHEDULE}
            className="mt-7 ms-btn ms-btn-primary ms-btn-lg ms-btn-block"
          >
            <ArrowLeft className="h-5 w-5" />
            Вернуться в расписание
          </Link>
        </section>
      </main>
    )
  }

  const counterpart =
    user?.uid === booking.tutorUid ? booking.studentName : booking.tutorName

  return (
    <main className="min-h-dvh bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[36px] border border-white/10 bg-slate-900 shadow-2xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 p-6 sm:p-9">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <Link
              href={ROUTES.SCHEDULE}
              className="relative inline-flex items-center gap-2 text-sm font-semibold text-violet-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Расписание
            </Link>
            <div className="relative mt-12">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                <Video className="h-4 w-4" />
                MedStart Live
              </span>
              <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
                {booking.subject}
              </h1>
              <p className="mt-3 text-violet-100">Занятие с {counterpart}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex items-center gap-3 rounded-2xl bg-black/15 p-4 backdrop-blur">
                  <CalendarDays className="h-5 w-5 text-violet-200" />
                  <div>
                    <p className="text-xs text-violet-200">Дата и время</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {formatBookingDate(booking)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-black/15 p-4 backdrop-blur">
                  <Clock3 className="h-5 w-5 text-violet-200" />
                  <div>
                    <p className="text-xs text-violet-200">Продолжительность</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {booking.durationMinutes} минут
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-9">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Всё готово</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Выберите режим подключения.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <MonitorUp className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
                <p>
                  Медицинская доска, снимки, клинические шаблоны и чат работают
                  без платного видеосервера.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <p>
                  Видеосвязь включим отдельным переключателем после подключения
                  собственного сервера.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={() => void join('audio')}
                disabled={joining !== null}
                className="ms-btn ms-btn-primary ms-btn-lg ms-btn-block"
              >
                {joining !== null ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <MonitorUp className="h-5 w-5" />
                )}
                Открыть медицинскую доску
              </button>
              <button
                type="button"
                disabled
                className="ms-btn ms-btn-on-dark ms-btn-lg ms-btn-block"
              >
                <Video className="h-5 w-5" />
                Видео будет подключено позже
              </button>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-slate-500">
              Доска, чат и учебные медицинские инструменты доступны уже сейчас.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
