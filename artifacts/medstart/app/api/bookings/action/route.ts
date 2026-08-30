import 'server-only'

import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed'
type BookingActionStatus = Extract<
  BookingStatus,
  'accepted' | 'declined' | 'cancelled' | 'completed'
>
type UnknownRecord = Record<string, unknown>

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function timestampMillis(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { toMillis?: () => number }
  return typeof candidate.toMillis === 'function' ? candidate.toMillis() : null
}

function activeRole(profile: UnknownRecord, role: 'student' | 'tutor') {
  return profile.role === role && profile.status === 'active'
}

function parseNextStatus(value: unknown): BookingActionStatus | null {
  return value === 'accepted' ||
    value === 'declined' ||
    value === 'cancelled' ||
    value === 'completed'
    ? value
    : null
}

function bookingInterval(booking: UnknownRecord) {
  const start = timestampMillis(booking.requestedStartAt)
  const directEnd = timestampMillis(booking.requestedEndAt)
  const duration = Math.max(30, Math.trunc(Number(booking.durationMinutes) || 60))
  const end = directEnd ?? (start === null ? null : start + duration * 60_000)
  return { start, end }
}

function overlaps(left: UnknownRecord, right: UnknownRecord) {
  const leftInterval = bookingInterval(left)
  const rightInterval = bookingInterval(right)
  if (
    leftInterval.start === null ||
    leftInterval.end === null ||
    rightInterval.start === null ||
    rightInterval.end === null
  ) {
    return false
  }
  return (
    leftInterval.start < rightInterval.end &&
    leftInterval.end > rightInterval.start
  )
}

export async function PATCH(request: NextRequest) {
  try {
    const token = bearerToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Требуется авторизация.' },
        { status: 401 },
      )
    }

    const decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: 'Подтвердите электронную почту.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    const bookingId = clean(body.bookingId, 200)
    const nextStatus = parseNextStatus(body.nextStatus)
    const response = clean(body.response, 1_000)
    if (!bookingId || bookingId.includes('/') || !nextStatus) {
      return NextResponse.json(
        { error: 'Некорректное действие с занятием.' },
        { status: 400 },
      )
    }
    if (nextStatus === 'declined' && response.length < 3) {
      return NextResponse.json(
        { error: 'Укажите причину отклонения.' },
        { status: 400 },
      )
    }

    const db = getFirebaseAdminDb()
    const bookingRef = db.collection('bookings').doc(bookingId)
    let resultingStatus: BookingActionStatus = nextStatus

    await db.runTransaction(async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef)
      if (!bookingSnapshot.exists) throw new Error('Заявка не найдена.')

      const booking = bookingSnapshot.data() as UnknownRecord
      const tutorUid = clean(booking.tutorUid, 160)
      const studentUid = clean(booking.studentUid, 160)
      const currentStatus = clean(booking.status, 40) as BookingStatus
      if (!tutorUid || !studentUid) {
        throw new Error('У занятия повреждены данные участников.')
      }

      const actorRef = db.collection('users').doc(decoded.uid)
      const calendarRef = db.collection('bookingCalendars').doc(tutorUid)
      const [actorSnapshot] = await Promise.all([
        transaction.get(actorRef),
        transaction.get(calendarRef),
      ])
      if (!actorSnapshot.exists) throw new Error('Профиль пользователя не найден.')
      const actor = actorSnapshot.data() as UnknownRecord

      const tutorAction = decoded.uid === tutorUid && activeRole(actor, 'tutor')
      const studentAction =
        decoded.uid === studentUid && activeRole(actor, 'student')

      const validTutorDecision =
        tutorAction &&
        currentStatus === 'pending' &&
        (nextStatus === 'accepted' || nextStatus === 'declined')
      const validStudentCancellation =
        studentAction &&
        (currentStatus === 'pending' || currentStatus === 'accepted') &&
        nextStatus === 'cancelled'
      const validTutorCompletion =
        tutorAction &&
        currentStatus === 'accepted' &&
        nextStatus === 'completed'

      if (
        !validTutorDecision &&
        !validStudentCancellation &&
        !validTutorCompletion
      ) {
        throw new Error('Это действие недоступно для текущего статуса занятия.')
      }

      if (nextStatus === 'accepted') {
        const targetInterval = bookingInterval(booking)
        if (targetInterval.start === null || targetInterval.end === null) {
          throw new Error('У занятия отсутствуют нормализованные временные метки.')
        }
        const tutorBookingsQuery = db
          .collection('bookings')
          .where('tutorUid', '==', tutorUid)
          .where('status', '==', 'accepted')
          .where('requestedStartAt', '<', Timestamp.fromMillis(targetInterval.end))
          .where('requestedEndAt', '>', Timestamp.fromMillis(targetInterval.start))
        const tutorBookingsSnapshot = await transaction.get(tutorBookingsQuery)
        for (const document of tutorBookingsSnapshot.docs) {
          if (document.id === bookingId) continue
          const existing = document.data() as UnknownRecord
          if (existing.status === 'accepted' && overlaps(booking, existing)) {
            throw new Error(
              'Это время уже занято подтверждённым занятием. Отклоните заявку или выберите другое время.',
            )
          }
        }
      }

      if (validTutorCompletion) {
        const requestedEnd = bookingInterval(booking).end
        if (!requestedEnd || Date.now() < requestedEnd) {
          throw new Error('Завершить занятие можно только после его окончания.')
        }
      }

      const patch: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: FieldValue.serverTimestamp(),
      }
      if (nextStatus === 'accepted') {
        patch.confirmedAt = FieldValue.serverTimestamp()
        patch.tutorResponse = response
      }
      if (nextStatus === 'declined') patch.tutorResponse = response
      if (nextStatus === 'completed') {
        patch.completedAt = FieldValue.serverTimestamp()
      }

      transaction.update(bookingRef, patch)
      transaction.set(
        calendarRef,
        {
          tutorUid,
          revision: FieldValue.increment(1),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      )
      resultingStatus = nextStatus
    })

    return NextResponse.json(
      { ok: true, status: resultingStatus },
      { headers: { 'cache-control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось изменить занятие.'
    const clientError =
      message.includes('не найдена') ||
      message.includes('не найден') ||
      message.includes('повреждены') ||
      message.includes('недоступно') ||
      message.includes('занято') ||
      message.includes('после его окончания')
    return NextResponse.json(
      { error: clientError ? message : 'Не удалось изменить занятие.' },
      { status: clientError ? 409 : 500 },
    )
  }
}
