'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  FolderOpen,
  LoaderCircle,
  MessageCircle,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import { subscribeToBookingsForUser } from '@/lib/bookings'
import { bookingDateTime, formatBookingDate, type Booking } from '@/lib/domain'

interface StudentSummary {
  uid: string
  name: string
  avatar: string
  conversationId: string
  lessonsCount: number
  completedCount: number
  nextLesson: Booking | null
  lastLesson: Booking | null
}

export default function TutorStudentsPage() {
  const { user, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || role !== 'tutor') {
      setLoading(false)
      return
    }
    return subscribeToBookingsForUser(
      user.uid,
      role,
      (items) => {
        setBookings(
          items.filter(
            (item) => item.status === 'accepted' || item.status === 'completed',
          ),
        )
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [user, role])

  const students = useMemo(() => {
    const map = new Map<string, StudentSummary>()
    for (const booking of bookings) {
      const current = map.get(booking.studentUid) ?? {
        uid: booking.studentUid,
        name: booking.studentName,
        avatar: booking.studentAvatar,
        conversationId: booking.conversationId,
        lessonsCount: 0,
        completedCount: 0,
        nextLesson: null,
        lastLesson: null,
      }
      current.lessonsCount += 1
      if (booking.status === 'completed') current.completedCount += 1
      const date = bookingDateTime(booking)
      if (
        booking.status === 'accepted' &&
        date >= Date.now() &&
        (!current.nextLesson || date < bookingDateTime(current.nextLesson))
      ) {
        current.nextLesson = booking
      }
      if (
        booking.status === 'completed' &&
        (!current.lastLesson || date > bookingDateTime(current.lastLesson))
      ) {
        current.lastLesson = booking
      }
      map.set(booking.studentUid, current)
    }
    return [...map.values()].sort((left, right) =>
      left.name.localeCompare(right.name, 'ru'),
    )
  }, [bookings])

  if (role !== 'tutor') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        Этот раздел доступен только репетиторам.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Мои студенты</h1>
        <p className="mt-2 text-slate-500">
          Здесь собраны студенты с подтверждёнными или завершёнными занятиями.
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : students.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => {
            const initials = student.name
              .split(/\s+/)
              .slice(0, 2)
              .map((item) => item.slice(0, 1))
              .join('')
              .toUpperCase()
            return (
              <article
                key={student.uid}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {student.avatar ? (
                    <ProfilePhoto
                      src={student.avatar}
                      size={56}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 font-bold text-violet-700">
                      {initials || 'MS'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-slate-900">
                      {student.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Занятий: {student.lessonsCount} · завершено:{' '}
                      {student.completedCount}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {student.nextLesson
                      ? 'Ближайшее занятие'
                      : 'Последнее занятие'}
                  </p>
                  {student.nextLesson || student.lastLesson ? (
                    <>
                      <p className="mt-2 font-semibold text-slate-800">
                        {(student.nextLesson ?? student.lastLesson)!.subject}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatBookingDate(
                          (student.nextLesson ?? student.lastLesson)!,
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Данных пока нет.
                    </p>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href={`/dashboard/messages?conversation=${student.conversationId}`}
                    className="ms-btn ms-btn-primary ms-btn-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Написать
                  </Link>
                  <Link
                    href={`/dashboard/materials?student=${student.uid}`}
                    className="ms-btn ms-btn-secondary ms-btn-sm"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Материал
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-violet-300 bg-violet-50 p-10 text-center">
          <UsersRound className="mx-auto h-11 w-11 text-violet-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Студентов пока нет
          </h2>
          <p className="mt-2 text-slate-500">
            После принятия первой заявки студент появится здесь.
          </p>
          <Link
            href="/dashboard/requests"
            className="mt-6 ms-btn ms-btn-primary"
          >
            <CalendarDays className="h-5 w-5" />
            Проверить заявки
          </Link>
        </div>
      )}
    </div>
  )
}
