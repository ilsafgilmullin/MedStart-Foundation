import 'server-only'

import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'accepted'])
const MAX_ACTIVE_STUDENT_BOOKINGS = 30
const MIN_LEAD_TIME_MS = 15 * 60 * 1000
const MAX_ADVANCE_MS = 366 * 24 * 60 * 60 * 1000

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

type WeekdayKey = (typeof WEEKDAY_KEYS)[number]
type LessonFormat = 'online' | 'in_person'

type UnknownRecord = Record<string, unknown>

interface BookingRequestBody {
  tutorUid: string
  subject: string
  goal: string
  requestedDate: string
  requestedTime: string
  timezone: string
  format: LessonFormat
  message: string
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function requiredString(value: unknown, label: string, maxLength: number) {
  const cleaned = cleanString(value, maxLength)
  if (!cleaned) throw new Error(`Укажите ${label}.`)
  return cleaned
}

function parseBody(value: unknown): BookingRequestBody {
  if (!isRecord(value)) throw new Error('Некорректные данные заявки.')

  const tutorUid = requiredString(value.tutorUid, 'репетитора', 160)
  const subject = requiredString(value.subject, 'тему занятия', 160)
  const requestedDate = requiredString(value.requestedDate, 'дату занятия', 10)
  const requestedTime = requiredString(value.requestedTime, 'время занятия', 5)
  const timezone = requiredString(value.timezone, 'часовой пояс', 80)
  const format = value.format

  if (format !== 'online' && format !== 'in_person') {
    throw new Error('Выбран неподдерживаемый формат занятия.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    throw new Error('Дата занятия указана некорректно.')
  }
  if (!/^\d{2}:\d{2}$/.test(requestedTime)) {
    throw new Error('Время занятия указано некорректно.')
  }

  return {
    tutorUid,
    subject,
    goal: cleanString(value.goal, 4000),
    requestedDate,
    requestedTime,
    timezone,
    format,
    message: cleanString(value.message, 2000),
  }
}

function authorizationToken(request: NextRequest) {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length).trim()
}

function timeZoneParts(instantMs: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const values: Record<string, number> = {}
  for (const part of formatter.formatToParts(new Date(instantMs))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function timeZoneOffsetMs(instantMs: number, timeZone: string) {
  const parts = timeZoneParts(instantMs, timeZone)
  const reconstructed = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return reconstructed - Math.floor(instantMs / 1000) * 1000
}

function zonedDateTimeToUtcMs(date: string, time: string, timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
  } catch {
    throw new Error('Указан неподдерживаемый часовой пояс.')
  }

  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error('Дата или время занятия указаны некорректно.')
  }

  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let instantMs = localAsUtc
  for (let iteration = 0; iteration < 3; iteration += 1) {
    instantMs = localAsUtc - timeZoneOffsetMs(instantMs, timeZone)
  }

  const verified = timeZoneParts(instantMs, timeZone)
  if (
    verified.year !== year ||
    verified.month !== month ||
    verified.day !== day ||
    verified.hour !== hour ||
    verified.minute !== minute
  ) {
    throw new Error(
      'Выбранное местное время не существует или неоднозначно из-за смены часового пояса.',
    )
  }

  return instantMs
}

function parseClockMinutes(value: unknown) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

function validateTutorAvailability(
  availability: UnknownRecord | undefined,
  startMs: number,
  durationMinutes: number,
) {
  if (!availability) return
  const timezone = cleanString(availability.timezone, 80)
  const days = availability.days
  if (!timezone || !isRecord(days)) {
    throw new Error('Расписание репетитора заполнено некорректно.')
  }

  const local = timeZoneParts(startMs, timezone)
  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day))
  const weekday = WEEKDAY_KEYS[localDate.getUTCDay()] as WeekdayKey
  const dayConfig = days[weekday]
  if (!isRecord(dayConfig) || dayConfig.enabled !== true) {
    throw new Error('В выбранный день репетитор не проводит занятия.')
  }

  const start = parseClockMinutes(dayConfig.start)
  const end = parseClockMinutes(dayConfig.end)
  const requestedStart = local.hour * 60 + local.minute
  if (
    start === null ||
    end === null ||
    start >= end ||
    requestedStart < start ||
    requestedStart + durationMinutes > end
  ) {
    throw new Error(
      'Выбранное время находится вне рабочего расписания репетитора.',
    )
  }
}

function timestampMillis(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { toMillis?: () => number }
  return typeof candidate.toMillis === 'function' ? candidate.toMillis() : null
}

function existingBookingStartMs(data: UnknownRecord) {
  const timestamp = timestampMillis(data.requestedStartAt)
  if (timestamp !== null) return timestamp
  const date = cleanString(data.requestedDate, 10)
  const time = cleanString(data.requestedTime, 5)
  const timezone = cleanString(data.timezone, 80)
  if (!date || !time || !timezone) return null
  try {
    return zonedDateTimeToUtcMs(date, time, timezone)
  } catch {
    return null
  }
}

function numericProfileField(
  profile: UnknownRecord,
  field: string,
  fallback: number,
) {
  const value = profile[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stringProfileField(profile: UnknownRecord, field: string) {
  return typeof profile[field] === 'string' ? profile[field] : ''
}

function activeBooking(data: UnknownRecord) {
  return (
    typeof data.status === 'string' && ACTIVE_BOOKING_STATUSES.has(data.status)
  )
}

export async function POST(request: NextRequest) {
  try {
    const token = authorizationToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Требуется авторизация.' },
        { status: 401 },
      )
    }

    const decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: 'Подтвердите электронную почту перед записью на занятие.' },
        { status: 403 },
      )
    }

    const input = parseBody(await request.json())
    if (input.tutorUid === decoded.uid) {
      throw new Error('Нельзя записаться на занятие к самому себе.')
    }

    const requestedStartMs = zonedDateTimeToUtcMs(
      input.requestedDate,
      input.requestedTime,
      input.timezone,
    )
    const now = Date.now()
    if (requestedStartMs < now + MIN_LEAD_TIME_MS) {
      throw new Error('Выберите время не раньше чем через 15 минут.')
    }
    if (requestedStartMs > now + MAX_ADVANCE_MS) {
      throw new Error('Запись доступна не более чем на год вперёд.')
    }

    const db = getFirebaseAdminDb()
    const studentRef = db.collection('users').doc(decoded.uid)
    const tutorRef = db.collection('users').doc(input.tutorUid)
    const availabilityRef = db.collection('availability').doc(input.tutorUid)
    const calendarRef = db.collection('bookingCalendars').doc(input.tutorUid)
    const bookingRef = db.collection('bookings').doc()
    const participantUids = [decoded.uid, input.tutorUid]
    const conversationId = [...participantUids].sort().join('__')
    const conversationRef = db.collection('conversations').doc(conversationId)
    const messageRef = conversationRef.collection('messages').doc()

    await db.runTransaction(async (transaction) => {
      // A shared server-only calendar document makes the overlap query serializable
      // even when it currently returns no documents. Concurrent creates for the
      // same tutor contend on this document and the losing transaction is retried.
      await transaction.get(calendarRef)

      const [
        studentSnapshot,
        tutorSnapshot,
        availabilitySnapshot,
        conversationSnapshot,
      ] = await Promise.all([
        transaction.get(studentRef),
        transaction.get(tutorRef),
        transaction.get(availabilityRef),
        transaction.get(conversationRef),
      ])

      if (!studentSnapshot.exists)
        throw new Error('Профиль студента не найден.')
      if (!tutorSnapshot.exists)
        throw new Error('Профиль репетитора не найден.')

      const student = studentSnapshot.data() as UnknownRecord
      const tutor = tutorSnapshot.data() as UnknownRecord
      if (student.role !== 'student' || student.status !== 'active') {
        throw new Error('Запись доступна только активному аккаунту студента.')
      }
      if (
        tutor.role !== 'tutor' ||
        tutor.status !== 'active' ||
        tutor.isPublic !== true
      ) {
        throw new Error('Этот репетитор пока недоступен для записи.')
      }

      const learnerTrack =
        student.learnerTrack === 'school' ? 'school' : 'medical'
      const tutorAudiences = Array.isArray(tutor.tutorAudiences)
        ? tutor.tutorAudiences.filter(
            (item): item is 'medical' | 'school' =>
              item === 'medical' || item === 'school',
          )
        : ['medical']
      if (!tutorAudiences.includes(learnerTrack)) {
        throw new Error(
          learnerTrack === 'school'
            ? 'Этот преподаватель не проводит занятия со школьниками.'
            : 'Этот преподаватель не проводит занятия со студентами медвузов.',
        )
      }
      const schoolExam =
        learnerTrack === 'school' &&
        (student.schoolExam === 'oge' || student.schoolExam === 'ege')
          ? student.schoolExam
          : ''
      if (learnerTrack === 'school') {
        const tutorExamTypes = Array.isArray(tutor.examTypes)
          ? tutor.examTypes.filter(
              (item): item is 'oge' | 'ege' => item === 'oge' || item === 'ege',
            )
          : []
        if (!schoolExam || !tutorExamTypes.includes(schoolExam)) {
          throw new Error(
            'Этот преподаватель не готовит к выбранному в профиле экзамену.',
          )
        }
      }

      const lessonFormats = Array.isArray(tutor.lessonFormats)
        ? tutor.lessonFormats.filter(
            (item): item is LessonFormat =>
              item === 'online' || item === 'in_person',
          )
        : []
      if (!lessonFormats.includes(input.format)) {
        throw new Error('Репетитор не проводит занятия в выбранном формате.')
      }

      const durationMinutes = Math.trunc(
        numericProfileField(tutor, 'lessonDuration', 60),
      )
      const price = numericProfileField(tutor, 'lessonPrice', 0)
      if (durationMinutes < 30 || durationMinutes > 180) {
        throw new Error(
          'У репетитора указана некорректная длительность занятия.',
        )
      }
      if (price < 0 || price > 10_000_000) {
        throw new Error('У репетитора указана некорректная стоимость занятия.')
      }

      validateTutorAvailability(
        availabilitySnapshot.exists
          ? (availabilitySnapshot.data() as UnknownRecord)
          : undefined,
        requestedStartMs,
        durationMinutes,
      )

      const requestedEndMs = requestedStartMs + durationMinutes * 60_000
      const tutorBookingsQuery = db
        .collection('bookings')
        .where('tutorUid', '==', input.tutorUid)
        .where('status', 'in', ['pending', 'accepted'])
        .where('requestedStartAt', '<', Timestamp.fromMillis(requestedEndMs))
        .where('requestedEndAt', '>', Timestamp.fromMillis(requestedStartMs))
      const studentBookingsQuery = db
        .collection('bookings')
        .where('studentUid', '==', decoded.uid)
        .where('status', 'in', ['pending', 'accepted'])
        .limit(MAX_ACTIVE_STUDENT_BOOKINGS)
      const [tutorBookingsSnapshot, studentBookingsSnapshot] =
        await Promise.all([
          transaction.get(tutorBookingsQuery),
          transaction.get(studentBookingsQuery),
        ])

      for (const existingDocument of tutorBookingsSnapshot.docs) {
        const existing = existingDocument.data() as UnknownRecord
        if (!activeBooking(existing)) continue
        const existingStartMs = existingBookingStartMs(existing)
        if (existingStartMs === null) continue
        const existingDuration = Math.trunc(
          typeof existing.durationMinutes === 'number'
            ? existing.durationMinutes
            : 60,
        )
        const existingEndMs = existingStartMs + existingDuration * 60_000
        if (
          requestedStartMs < existingEndMs &&
          requestedEndMs > existingStartMs
        ) {
          throw new Error('Это время уже занято другой заявкой или занятием.')
        }
      }

      const activeStudentBookings = studentBookingsSnapshot.size
      if (activeStudentBookings >= MAX_ACTIVE_STUDENT_BOOKINGS) {
        throw new Error(
          'Слишком много активных заявок. Завершите или отмените часть из них.',
        )
      }

      const studentName = stringProfileField(student, 'displayName')
      const tutorName = stringProfileField(tutor, 'displayName')
      if (!studentName || !tutorName) {
        throw new Error('В профиле участника отсутствует отображаемое имя.')
      }

      const messageText =
        input.message ||
        `Здравствуйте! Хочу записаться на занятие по теме «${input.subject}».`
      const timestamp = FieldValue.serverTimestamp()
      const booking = {
        studentUid: decoded.uid,
        studentName,
        studentAvatar: stringProfileField(student, 'avatar'),
        tutorUid: input.tutorUid,
        tutorName,
        tutorAvatar: stringProfileField(tutor, 'avatar'),
        learnerTrack,
        ...(learnerTrack === 'school'
          ? {
              schoolExam,
              schoolGrade: stringProfileField(student, 'schoolGrade'),
            }
          : {}),
        subject: input.subject,
        goal: input.goal,
        requestedDate: input.requestedDate,
        requestedTime: input.requestedTime,
        timezone: input.timezone,
        requestedStartAt: Timestamp.fromMillis(requestedStartMs),
        requestedEndAt: Timestamp.fromMillis(requestedEndMs),
        durationMinutes,
        format: input.format,
        price,
        status: 'pending',
        studentMessage: messageText,
        tutorResponse: '',
        conversationId,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      transaction.set(
        calendarRef,
        {
          tutorUid: input.tutorUid,
          revision: FieldValue.increment(1),
          updatedAt: timestamp,
        },
        { merge: true },
      )
      transaction.set(bookingRef, booking)

      const conversationUpdate = {
        latestBookingId: bookingRef.id,
        lastMessage: messageText,
        lastSenderUid: decoded.uid,
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      }
      if (conversationSnapshot.exists) {
        const existingConversation =
          conversationSnapshot.data() as UnknownRecord
        const existingParticipants = Array.isArray(
          existingConversation.participantUids,
        )
          ? existingConversation.participantUids
          : []
        if (
          existingParticipants.length !== 2 ||
          !participantUids.every((uid) => existingParticipants.includes(uid))
        ) {
          throw new Error(
            'Существующий диалог имеет некорректный состав участников.',
          )
        }
        transaction.update(conversationRef, conversationUpdate)
      } else {
        transaction.set(conversationRef, {
          participantUids,
          participantNames: {
            [decoded.uid]: studentName,
            [input.tutorUid]: tutorName,
          },
          participantAvatars: {
            [decoded.uid]: stringProfileField(student, 'avatar'),
            [input.tutorUid]: stringProfileField(tutor, 'avatar'),
          },
          ...conversationUpdate,
          createdAt: timestamp,
        })
      }

      transaction.set(messageRef, {
        senderUid: decoded.uid,
        text: messageText,
        createdAt: timestamp,
      })
    })

    return NextResponse.json(
      { bookingId: bookingRef.id, conversationId },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось создать заявку.'
    const knownClientError =
      message.includes('Укажите') ||
      message.includes('Выберите') ||
      message.includes('выбран') ||
      message.includes('некоррект') ||
      message.includes('недоступ') ||
      message.includes('занят') ||
      message.includes('Слишком много') ||
      message.includes('Нельзя') ||
      message.includes('Профиль') ||
      message.includes('Расписание') ||
      message.includes('проводит') ||
      message.includes('отсутствует')

    return NextResponse.json(
      { error: knownClientError ? message : 'Не удалось создать заявку.' },
      { status: knownClientError ? 400 : 500 },
    )
  }
}
