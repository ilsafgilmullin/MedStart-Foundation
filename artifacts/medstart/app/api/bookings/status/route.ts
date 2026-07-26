import { NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type NextStatus = 'accepted' | 'declined' | 'cancelled' | 'completed'

interface StatusRequestBody {
  bookingId?: unknown
  nextStatus?: unknown
  response?: unknown
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function validTimezone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

function zonedDateTimeToMillis(date: string, time: string, timeZone: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch || !validTimezone(timeZone)) return 0

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute)
  const guessedDate = new Date(utcGuess)
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    guessedDate.getUTCFullYear() !== year ||
    guessedDate.getUTCMonth() !== month - 1 ||
    guessedDate.getUTCDate() !== day
  ) {
    return 0
  }

  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const offsetAt = (millis: number) => {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(millis))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    )
    return (
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      ) - millis
    )
  }
  const firstPass = utcGuess - offsetAt(utcGuess)
  return utcGuess - offsetAt(firstPass)
}

function timestampMillis(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis()
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis
    if (typeof toMillis === 'function') return toMillis.call(value)
  }
  return 0
}

function bookingStart(data: Record<string, unknown>) {
  return (
    timestampMillis(data.startsAt) ||
    zonedDateTimeToMillis(
      String(data.requestedDate || ''),
      String(data.requestedTime || ''),
      String(data.timezone || 'Europe/Moscow'),
    )
  )
}

function overlaps(
  candidate: Record<string, unknown>,
  start: number,
  end: number,
  excludedBookingId: string,
  candidateId: string,
) {
  if (candidateId === excludedBookingId || candidate.status !== 'accepted') {
    return false
  }
  const candidateStart = bookingStart(candidate)
  const candidateDuration = Math.min(
    180,
    Math.max(30, Number(candidate.durationMinutes) || 60),
  )
  const candidateEnd = candidateStart + candidateDuration * 60_000
  return candidateStart < end && start < candidateEnd
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    return jsonError('Войдите в аккаунт MedStart ещё раз.', 401)
  }

  let body: StatusRequestBody
  try {
    body = (await request.json()) as StatusRequestBody
  } catch {
    return jsonError('Некорректный запрос изменения занятия.', 400)
  }

  const bookingId = cleanString(body.bookingId, 160)
  const nextStatus = cleanString(body.nextStatus, 20) as NextStatus
  const responseText = cleanString(body.response, 2_000)
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(bookingId)) {
    return jsonError('Некорректный идентификатор занятия.', 400)
  }
  if (!['accepted', 'declined', 'cancelled', 'completed'].includes(nextStatus)) {
    return jsonError('Некорректный новый статус занятия.', 400)
  }
  if (nextStatus === 'declined' && responseText.length < 3) {
    return jsonError('Укажите причину отклонения заявки.', 400)
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(
      authorization.slice('Bearer '.length),
      true,
    )
    const database = getFirebaseAdminDb()
    const userRef = database.collection('users').doc(decoded.uid)
    const bookingRef = database.collection('bookings').doc(bookingId)

    await database.runTransaction(async (transaction) => {
      const [userSnapshot, bookingSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(bookingRef),
      ])
      if (!userSnapshot.exists || userSnapshot.data()?.status !== 'active') {
        throw new Error('ACCOUNT_INACTIVE')
      }
      if (!bookingSnapshot.exists) throw new Error('BOOKING_NOT_FOUND')

      const booking = bookingSnapshot.data() as Record<string, unknown>
      const participantRole =
        booking.studentUid === decoded.uid
          ? 'student'
          : booking.tutorUid === decoded.uid
            ? 'tutor'
            : null
      if (!participantRole) throw new Error('FORBIDDEN')

      const currentStatus = String(booking.status || '')
      const tutorDecision =
        participantRole === 'tutor' &&
        currentStatus === 'pending' &&
        (nextStatus === 'accepted' || nextStatus === 'declined')
      const tutorCompletion =
        participantRole === 'tutor' &&
        currentStatus === 'accepted' &&
        nextStatus === 'completed'
      const studentCancellation =
        participantRole === 'student' &&
        ['pending', 'accepted'].includes(currentStatus) &&
        nextStatus === 'cancelled'

      if (!tutorDecision && !tutorCompletion && !studentCancellation) {
        throw new Error('INVALID_TRANSITION')
      }

      if (nextStatus === 'accepted') {
        const start = bookingStart(booking)
        if (!start) throw new Error('DATETIME_INVALID')
        const duration = Math.min(
          180,
          Math.max(30, Number(booking.durationMinutes) || 60),
        )
        const end = start + duration * 60_000
        const [tutorBookings, studentBookings] = await Promise.all([
          transaction.get(
            database
              .collection('bookings')
              .where('tutorUid', '==', String(booking.tutorUid || '')),
          ),
          transaction.get(
            database
              .collection('bookings')
              .where('studentUid', '==', String(booking.studentUid || '')),
          ),
        ])
        const conflict = [...tutorBookings.docs, ...studentBookings.docs].some(
          (document) =>
            overlaps(
              document.data() as Record<string, unknown>,
              start,
              end,
              bookingId,
              document.id,
            ),
        )
        if (conflict) throw new Error('SLOT_CONFLICT')
      }

      const patch: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: FieldValue.serverTimestamp(),
      }
      if (nextStatus === 'accepted') {
        patch.confirmedAt = FieldValue.serverTimestamp()
        patch.tutorResponse = responseText
      } else if (nextStatus === 'declined') {
        patch.tutorResponse = responseText
      } else if (nextStatus === 'completed') {
        patch.completedAt = FieldValue.serverTimestamp()
      }
      transaction.update(bookingRef, patch)
    })

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const known: Record<string, [string, number]> = {
      ACCOUNT_INACTIVE: ['Аккаунт не имеет доступа к занятию.', 403],
      BOOKING_NOT_FOUND: ['Занятие не найдено.', 404],
      FORBIDDEN: ['У вас нет доступа к этому занятию.', 403],
      INVALID_TRANSITION: ['Это действие недоступно для текущего статуса занятия.', 409],
      DATETIME_INVALID: ['В занятии указаны некорректные дата или время.', 409],
      SLOT_CONFLICT: ['В это время у репетитора или студента уже есть занятие.', 409],
    }
    if (known[code]) return jsonError(known[code][0], known[code][1])

    const authCode =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : ''
    if (authCode.startsWith('auth/')) {
      return jsonError('Сессия устарела. Войдите в MedStart ещё раз.', 401)
    }
    return jsonError('Не удалось безопасно обновить занятие.', 500)
  }
}
