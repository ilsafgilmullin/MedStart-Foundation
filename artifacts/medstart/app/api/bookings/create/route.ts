import { NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ADVANCE_DAYS = 180
const MIN_ADVANCE_MS = 5 * 60_000
const MIN_REQUEST_INTERVAL_MS = 15_000
const MAX_DAILY_REQUESTS = 20

interface BookingRequestBody {
  tutorUid?: unknown
  subject?: unknown
  goal?: unknown
  requestedDate?: unknown
  requestedTime?: unknown
  format?: unknown
  message?: unknown
}

interface ProfileData {
  uid?: string
  role?: string
  status?: string
  isPublic?: boolean
  displayName?: string
  avatar?: string
  timezone?: string
  lessonDuration?: number
  lessonPrice?: number
  lessonFormats?: string[]
}

interface AvailabilityDay {
  enabled?: boolean
  start?: string
  end?: string
}

interface AvailabilityData {
  timezone?: string
  days?: Record<string, AvailabilityDay>
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

function weekdayKey(millis: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  })
    .format(new Date(millis))
    .toLowerCase()
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return -1
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return -1
  return hour * 60 + minute
}

function timestampMillis(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis()
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: () => number }).toMillis
    if (typeof toMillis === 'function') return toMillis.call(value)
  }
  return 0
}

function conversationIdFor(firstUid: string, secondUid: string) {
  return [firstUid, secondUid].sort().join('__')
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    return jsonError('Войдите в аккаунт MedStart ещё раз.', 401)
  }

  let body: BookingRequestBody
  try {
    body = (await request.json()) as BookingRequestBody
  } catch {
    return jsonError('Некорректный запрос на запись.', 400)
  }

  const tutorUid = cleanString(body.tutorUid, 160)
  const subject = cleanString(body.subject, 160)
  const goal = cleanString(body.goal, 4_000)
  const requestedDate = cleanString(body.requestedDate, 10)
  const requestedTime = cleanString(body.requestedTime, 5)
  const format = cleanString(body.format, 20)
  const suppliedMessage = cleanString(body.message, 2_000)

  if (!/^[A-Za-z0-9_-]{6,160}$/.test(tutorUid)) {
    return jsonError('Некорректный идентификатор репетитора.', 400)
  }
  if (subject.length < 2) {
    return jsonError('Укажите предмет или тему занятия.', 400)
  }
  if (!['online', 'in_person'].includes(format)) {
    return jsonError('Некорректный формат занятия.', 400)
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(
      authorization.slice('Bearer '.length),
      true,
    )
    if (decoded.email && decoded.email_verified !== true) {
      return jsonError('Подтвердите электронную почту перед записью.', 403)
    }

    const database = getFirebaseAdminDb()
    const studentRef = database.collection('users').doc(decoded.uid)
    const tutorRef = database.collection('users').doc(tutorUid)
    const availabilityRef = database.collection('availability').doc(tutorUid)
    const conversationId = conversationIdFor(decoded.uid, tutorUid)
    const conversationRef = database.collection('conversations').doc(conversationId)
    const rateRef = database.collection('bookingRateLimits').doc(decoded.uid)
    const bookingRef = database.collection('bookings').doc()
    const messageRef = conversationRef.collection('messages').doc()

    const result = await database.runTransaction(async (transaction) => {
      const [studentSnapshot, tutorSnapshot, availabilitySnapshot, conversationSnapshot, rateSnapshot] =
        await Promise.all([
          transaction.get(studentRef),
          transaction.get(tutorRef),
          transaction.get(availabilityRef),
          transaction.get(conversationRef),
          transaction.get(rateRef),
        ])

      if (!studentSnapshot.exists) {
        throw new Error('PROFILE_NOT_FOUND')
      }
      const student = studentSnapshot.data() as ProfileData
      if (student.role !== 'student' || student.status !== 'active') {
        throw new Error('STUDENT_INACTIVE')
      }

      if (!tutorSnapshot.exists) {
        throw new Error('TUTOR_NOT_FOUND')
      }
      const tutor = tutorSnapshot.data() as ProfileData
      if (
        tutor.role !== 'tutor' ||
        tutor.status !== 'active' ||
        tutor.isPublic !== true
      ) {
        throw new Error('TUTOR_UNAVAILABLE')
      }

      const allowedFormats = Array.isArray(tutor.lessonFormats)
        ? tutor.lessonFormats
        : ['online']
      if (!allowedFormats.includes(format)) {
        throw new Error('FORMAT_UNAVAILABLE')
      }

      if (!availabilitySnapshot.exists) {
        throw new Error('AVAILABILITY_MISSING')
      }
      const availability = availabilitySnapshot.data() as AvailabilityData
      const timeZone =
        cleanString(availability.timezone, 80) ||
        cleanString(tutor.timezone, 80) ||
        'Europe/Moscow'
      if (!validTimezone(timeZone)) {
        throw new Error('TIMEZONE_INVALID')
      }

      const startsAtMs = zonedDateTimeToMillis(
        requestedDate,
        requestedTime,
        timeZone,
      )
      const now = Date.now()
      if (!startsAtMs) throw new Error('DATETIME_INVALID')
      if (startsAtMs < now + MIN_ADVANCE_MS) throw new Error('DATETIME_PAST')
      if (startsAtMs > now + MAX_ADVANCE_DAYS * 24 * 60 * 60_000) {
        throw new Error('DATETIME_TOO_FAR')
      }

      const durationMinutes = Math.min(
        180,
        Math.max(30, Number(tutor.lessonDuration) || 60),
      )
      const requestedMinutes = timeToMinutes(requestedTime)
      const day = availability.days?.[weekdayKey(startsAtMs, timeZone)]
      const dayStart = timeToMinutes(day?.start || '')
      const dayEnd = timeToMinutes(day?.end || '')
      if (
        day?.enabled !== true ||
        requestedMinutes < dayStart ||
        requestedMinutes + durationMinutes > dayEnd
      ) {
        throw new Error('OUTSIDE_AVAILABILITY')
      }

      const [tutorBookings, studentBookings] = await Promise.all([
        transaction.get(
          database.collection('bookings').where('tutorUid', '==', tutorUid),
        ),
        transaction.get(
          database.collection('bookings').where('studentUid', '==', decoded.uid),
        ),
      ])
      const requestedEnd = startsAtMs + durationMinutes * 60_000
      const hasConflict = [...tutorBookings.docs, ...studentBookings.docs].some(
        (document) => {
          const existing = document.data() as Record<string, unknown>
          if (!['pending', 'accepted'].includes(String(existing.status))) return false
          const existingStart =
            timestampMillis(existing.startsAt) ||
            zonedDateTimeToMillis(
              String(existing.requestedDate || ''),
              String(existing.requestedTime || ''),
              String(existing.timezone || 'Europe/Moscow'),
            )
          const existingDuration = Math.min(
            180,
            Math.max(30, Number(existing.durationMinutes) || 60),
          )
          const existingEnd = existingStart + existingDuration * 60_000
          return existingStart < requestedEnd && startsAtMs < existingEnd
        },
      )
      if (hasConflict) throw new Error('SLOT_CONFLICT')

      const rate = rateSnapshot.data() as
        | { dayKey?: string; count?: number; lastCreatedAt?: Timestamp }
        | undefined
      const dayKey = new Date(now).toISOString().slice(0, 10)
      const previousCount = rate?.dayKey === dayKey ? Number(rate.count) || 0 : 0
      const previousAt = timestampMillis(rate?.lastCreatedAt)
      if (previousAt && now - previousAt < MIN_REQUEST_INTERVAL_MS) {
        throw new Error('RATE_FAST')
      }
      if (previousCount >= MAX_DAILY_REQUESTS) {
        throw new Error('RATE_DAILY')
      }

      const studentName = cleanString(student.displayName, 160) || 'Студент MedStart'
      const tutorName = cleanString(tutor.displayName, 160) || 'Репетитор MedStart'
      const messageText =
        suppliedMessage ||
        `Здравствуйте! Хочу записаться на занятие по теме «${subject}».`
      const nowValue = FieldValue.serverTimestamp()

      const rawPrice = Number(tutor.lessonPrice)
      const lessonPrice =
        Number.isFinite(rawPrice) && rawPrice >= 0 && rawPrice <= 1_000_000
          ? rawPrice
          : 0

      transaction.set(bookingRef, {
        studentUid: decoded.uid,
        studentName,
        studentAvatar: cleanString(student.avatar, 2_000),
        tutorUid,
        tutorName,
        tutorAvatar: cleanString(tutor.avatar, 2_000),
        subject,
        goal,
        requestedDate,
        requestedTime,
        timezone: timeZone,
        startsAt: Timestamp.fromMillis(startsAtMs),
        durationMinutes,
        format,
        price: lessonPrice,
        status: 'pending',
        studentMessage: messageText,
        tutorResponse: '',
        conversationId,
        createdAt: nowValue,
        updatedAt: nowValue,
      })

      const conversationUpdate = {
        latestBookingId: bookingRef.id,
        lastMessage: messageText,
        lastSenderUid: decoded.uid,
        lastMessageAt: nowValue,
        updatedAt: nowValue,
      }

      if (conversationSnapshot.exists) {
        const current = conversationSnapshot.data()
        const participants = Array.isArray(current?.participantUids)
          ? current.participantUids
          : []
        if (!participants.includes(decoded.uid) || !participants.includes(tutorUid)) {
          throw new Error('CONVERSATION_CONFLICT')
        }
        transaction.set(conversationRef, conversationUpdate, { merge: true })
      } else {
        transaction.set(conversationRef, {
          participantUids: [decoded.uid, tutorUid],
          participantNames: {
            [decoded.uid]: studentName,
            [tutorUid]: tutorName,
          },
          participantAvatars: {
            [decoded.uid]: cleanString(student.avatar, 2_000),
            [tutorUid]: cleanString(tutor.avatar, 2_000),
          },
          ...conversationUpdate,
          createdAt: nowValue,
        })
      }

      transaction.set(messageRef, {
        senderUid: decoded.uid,
        text: messageText,
        createdAt: nowValue,
      })
      transaction.set(rateRef, {
        dayKey,
        count: previousCount + 1,
        lastCreatedAt: nowValue,
      })

      return { bookingId: bookingRef.id, conversationId }
    })

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const known: Record<string, [string, number]> = {
      PROFILE_NOT_FOUND: ['Профиль студента не найден.', 403],
      STUDENT_INACTIVE: ['Аккаунт студента неактивен.', 403],
      TUTOR_NOT_FOUND: ['Репетитор не найден.', 404],
      TUTOR_UNAVAILABLE: ['Этот репетитор сейчас недоступен для записи.', 409],
      FORMAT_UNAVAILABLE: ['Выбранный формат недоступен у репетитора.', 409],
      AVAILABILITY_MISSING: ['Репетитор ещё не опубликовал рабочие часы.', 409],
      TIMEZONE_INVALID: ['В расписании указан некорректный часовой пояс.', 409],
      DATETIME_INVALID: ['Укажите корректные дату и время.', 400],
      DATETIME_PAST: ['Нельзя записаться на прошедшее или слишком близкое время.', 409],
      DATETIME_TOO_FAR: ['Запись доступна не более чем на 180 дней вперёд.', 409],
      OUTSIDE_AVAILABILITY: ['Выбранное время находится вне рабочих часов репетитора.', 409],
      SLOT_CONFLICT: ['В это время у репетитора или студента уже есть заявка либо занятие.', 409],
      RATE_FAST: ['Подождите несколько секунд перед следующей заявкой.', 429],
      RATE_DAILY: ['Достигнут дневной лимит заявок.', 429],
      CONVERSATION_CONFLICT: ['Не удалось безопасно создать диалог.', 409],
    }
    if (known[code]) return jsonError(known[code][0], known[code][1])

    const authCode =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : ''
    if (authCode.startsWith('auth/')) {
      return jsonError('Сессия устарела. Войдите в MedStart ещё раз.', 401)
    }
    return jsonError('Не удалось безопасно создать заявку. Повторите попытку.', 500)
  }
}
