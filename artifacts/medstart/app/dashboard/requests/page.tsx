'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react'
import BookingCard from '@/components/dashboard/BookingCard'
import { useAuth } from '@/hooks/useAuth'
import { changeBookingStatus, subscribeToBookingsForUser } from '@/lib/bookings'
import type { Booking } from '@/lib/domain'

export default function TutorRequestsPage() {
  const { user, role } = useAuth()
  const [items, setItems] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || role !== 'tutor') {
      setLoading(false)
      return
    }
    return subscribeToBookingsForUser(
      user.uid,
      role,
      (bookings) => {
        setItems(bookings.filter((item) => item.status === 'pending'))
        setLoading(false)
      },
      () => {
        setError('Не удалось загрузить заявки.')
        setLoading(false)
      },
    )
  }, [user, role])

  async function act(booking: Booking, status: 'accepted' | 'declined') {
    if (!user) return
    let response = ''
    if (status === 'accepted') {
      response =
        window.prompt(
          'Короткий ответ студенту (можно оставить пустым):',
          'Заявка принята. До встречи на занятии!',
        ) ?? ''
    } else {
      response =
        window.prompt(
          'Почему это время не подходит? Ответ увидит студент:',
          'К сожалению, это время занято. Напишите мне в чате, чтобы выбрать другое.',
        ) ?? ''
      if (!response.trim()) return
    }

    setBusyId(booking.id)
    setError('')
    try {
      await changeBookingStatus({
        bookingId: booking.id,
        actorUid: user.uid,
        nextStatus: status,
        response,
      })
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Заявки студентов</h1>
        <p className="mt-2 text-slate-500">
          Подтвердите предложенное время или объясните, почему оно не подходит.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : items.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {items.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              role="tutor"
              busy={busyId === booking.id}
              onAction={(status) => {
                if (status === 'accepted' || status === 'declined') {
                  void act(booking, status)
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-violet-300 bg-violet-50 p-10 text-center">
          <Inbox className="mx-auto h-11 w-11 text-violet-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Новых заявок нет
          </h2>
          <p className="mt-2 text-slate-500">
            Они появятся здесь сразу после записи студента.
          </p>
        </div>
      )}
    </div>
  )
}
