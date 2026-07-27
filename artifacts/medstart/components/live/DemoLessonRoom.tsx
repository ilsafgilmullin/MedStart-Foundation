'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Clock3,
  LayoutDashboard,
  MessageCircle,
  MonitorUp,
  ShieldCheck,
  UsersRound,
  VideoOff,
} from 'lucide-react'
import LessonChat from './LessonChat'
import MedicalWorkspace from './MedicalWorkspace'
import { bookingDateTime, formatBookingDate, type Booking } from '@/lib/domain'

interface DemoLessonRoomProps {
  booking: Booking
  userUid: string
  userName: string
  participantRole: 'student' | 'tutor'
  onLeave: () => void
}

type MobileView = 'board' | 'video' | 'chat'

function VideoUnavailable() {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300/30 bg-amber-400/5 p-6 text-center">
      <div className="rounded-2xl bg-amber-300/10 p-4 text-amber-200">
        <VideoOff className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-base font-bold text-white">
        Видеосервер подключим позже
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        Медицинская доска, снимки, 3D-анатомия, клинические шаблоны,
        лаборатория, ЭКГ и чат уже доступны без платного сервера.
      </p>
    </div>
  )
}

export default function DemoLessonRoom({
  booking,
  userUid,
  userName,
  participantRole,
  onLeave,
}: DemoLessonRoomProps) {
  const [mobileView, setMobileView] = useState<MobileView>('board')
  const [sessionStartedAt] = useState(() => Date.now())
  const [now, setNow] = useState(sessionStartedAt)
  const counterpart =
    participantRole === 'tutor' ? booking.studentName : booking.tutorName

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const timeLabel = useMemo(() => {
    const scheduledStart = bookingDateTime(booking)
    if (!scheduledStart || now < scheduledStart) {
      return formatBookingDate(booking)
    }
    const elapsed = Math.max(
      0,
      Math.floor((now - Math.max(sessionStartedAt, scheduledStart)) / 60_000),
    )
    return `${elapsed} мин в комнате`
  }, [booking, now, sessionStartedAt])

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
      <header className="shrink-0 border-b border-white/10 bg-slate-950/95 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3">
          <button
            type="button"
            onClick={onLeave}
            aria-label="Вернуться в расписание"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold sm:text-base">
                {booking.subject}
              </h1>
              <span className="hidden rounded-full bg-violet-500/20 px-2 py-1 text-[10px] font-semibold text-violet-200 sm:inline">
                MedStart Medical Workspace
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-slate-400">
              <span className="truncate">С вами: {counterpart}</span>
              <span>·</span>
              <span className="flex shrink-0 items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {timeLabel}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full bg-amber-400/10 px-3 py-2 text-[10px] font-semibold text-amber-100 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="hidden sm:inline">Без видеосервера</span>
            <ShieldCheck className="h-3.5 w-3.5 text-amber-200" />
          </div>
        </div>

        <nav className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 lg:hidden">
          {(
            [
              ['board', 'Меддоска', LayoutDashboard],
              ['video', 'Видео', UsersRound],
              ['chat', 'Чат', MessageCircle],
            ] as const
          ).map(([view, label, Icon]) => (
            <button
              key={view}
              type="button"
              onClick={() => setMobileView(view)}
              aria-pressed={mobileView === view}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold ${
                mobileView === view
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div
          className={`min-h-0 ${mobileView === 'board' ? 'block' : 'hidden'} lg:block`}
        >
          <MedicalWorkspace
            bookingId={booking.id}
            userUid={userUid}
            userName={userName}
            tutorUid={booking.tutorUid}
            canClear={participantRole === 'tutor'}
            participantRole={participantRole}
          />
        </div>

        <aside className="hidden min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-3 lg:flex">
          <div className="max-h-[48%] min-h-[250px] overflow-hidden">
            <VideoUnavailable />
          </div>
          <LessonChat booking={booking} userUid={userUid} />
        </aside>

        {mobileView === 'video' && (
          <div className="min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-3 lg:hidden">
            <VideoUnavailable />
          </div>
        )}

        {mobileView === 'chat' && (
          <div className="flex min-h-0 lg:hidden">
            <LessonChat booking={booking} userUid={userUid} />
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-white/10 bg-slate-950/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-center text-[11px] text-slate-500 backdrop-blur">
        <span className="inline-flex items-center gap-1.5">
          <MonitorUp className="h-3.5 w-3.5 text-violet-300" />
          Учебный режим без видеосвязи. Совместные данные сохраняются в Firebase.
        </span>
      </footer>
    </div>
  )
}
