'use client'

import Link from 'next/link'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Radio,
  Video,
  X,
} from 'lucide-react'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import { ROUTES } from '@/lib/constants'
import {
  BOOKING_STATUS_LABELS,
  formatBookingDate,
  type Booking,
  type BookingStatus,
} from '@/lib/domain'
import type { EffectiveUserRole } from '@/lib/user-profile'

const statusStyles: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  completed: 'bg-violet-100 text-violet-700',
}

type ActionStatus = 'accepted' | 'declined' | 'cancelled' | 'completed'

interface BookingCardProps {
  booking: Booking
  role: EffectiveUserRole
  busy?: boolean
  onAction?: (status: ActionStatus) => void
  compact?: boolean
}

export default function BookingCard({
  booking,
  role,
  busy = false,
  onAction,
  compact = false,
}: BookingCardProps) {
  const tutorView = role === 'tutor'
  const counterpart = tutorView ? booking.studentName : booking.tutorName
  const avatar = tutorView ? booking.studentAvatar : booking.tutorAvatar
  const initials = counterpart
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('')
    .toUpperCase()

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {avatar ? (
            <ProfilePhoto
              src={avatar}
              size={48}
              className="h-12 w-12 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 font-bold text-violet-700">
              {initials || 'MS'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {tutorView ? 'Студент' : 'Репетитор'}
            </p>
            <h2 className="truncate text-lg font-bold text-slate-900">
              {counterpart}
            </h2>
          </div>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[booking.status]}`}
        >
          {BOOKING_STATUS_LABELS[booking.status]}
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <h3 className="font-bold text-slate-900">{booking.subject}</h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-violet-600" />
            {formatBookingDate(booking)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-violet-600" />
            {booking.durationMinutes} минут
          </span>
          <span className="flex items-center gap-1.5">
            {booking.format === 'online' ? (
              <Video className="h-4 w-4 text-violet-600" />
            ) : (
              <MapPin className="h-4 w-4 text-violet-600" />
            )}
            {booking.format === 'online' ? 'Онлайн' : 'Очно'}
          </span>
        </div>
      </div>

      {!compact && booking.goal && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Цель занятия
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {booking.goal}
          </p>
        </div>
      )}

      {!compact && booking.studentMessage && tutorView && (
        <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            Сообщение студента
          </p>
          <p className="mt-1 text-sm leading-6 text-violet-900">
            {booking.studentMessage}
          </p>
        </div>
      )}

      {booking.tutorResponse && !tutorView && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Ответ репетитора
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            {booking.tutorResponse}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {booking.status === 'accepted' && booking.format === 'online' && (
          <Link
            href={ROUTES.LESSON(booking.id)}
            className="ms-btn ms-btn-primary ms-btn-sm"
          >
            <Radio className="h-4 w-4" />
            Войти в онлайн-занятие
          </Link>
        )}

        <Link
          href={`/dashboard/messages?conversation=${booking.conversationId}`}
          className="ms-btn ms-btn-secondary ms-btn-sm"
        >
          <MessageCircle className="h-4 w-4" />
          Диалог
        </Link>

        {onAction && tutorView && booking.status === 'pending' && (
          <>
            <button
              type="button"
              onClick={() => onAction('accepted')}
              disabled={busy}
              className="ms-btn ms-btn-primary ms-btn-sm"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Принять
            </button>
            <button
              type="button"
              onClick={() => onAction('declined')}
              disabled={busy}
              className="ms-btn ms-btn-danger-outline ms-btn-sm"
            >
              <X className="h-4 w-4" />
              Отклонить
            </button>
          </>
        )}

        {onAction && tutorView && booking.status === 'accepted' && (
          <button
            type="button"
            onClick={() => onAction('completed')}
            disabled={busy}
            className="ms-btn ms-btn-primary ms-btn-sm"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Завершить занятие
          </button>
        )}

        {onAction &&
          role === 'student' &&
          (booking.status === 'pending' || booking.status === 'accepted') && (
            <button
              type="button"
              onClick={() => onAction('cancelled')}
              disabled={busy}
              className="ms-btn ms-btn-danger-outline ms-btn-sm"
            >
              <X className="h-4 w-4" />
              Отменить
            </button>
          )}
      </div>
    </article>
  )
}
