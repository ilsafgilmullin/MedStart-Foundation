import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/domain'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'
import { createLessonToken } from '@/lib/server/livekit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VIDEO_ROOM_OPEN_BEFORE_MS = 30 * 60 * 1000
const VIDEO_ROOM_CLOSE_AFTER_MS = 4 * 60 * 60 * 1000

interface TokenRequestBody {
  bookingId?: unknown
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

function isLiveKitConfigurationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('LIVEKIT_') ||
    message.includes('LiveKit') ||
    message.includes('видеосвязи MedStart')
  )
}

function isVideoServerEnabled() {
  const value = process.env.MEDSTART_LIVE_VIDEO_ENABLED
    ?.trim()
    .toLowerCase()

  return value === 'true' || value === '1' || value === 'yes'
}

function demoCredentials(booking: Booking) {
  return {
    serverUrl: 'demo://local',
    roomName: `medstart-demo-${booking.id}`,
    participantToken: 'protected-no-server-mode',
  }
}

function demoResponse(booking: Booking) {
  return NextResponse.json(demoCredentials(booking), {
    headers: {
      'Cache-Control': 'no-store',
      'X-MedStart-Mode': 'medical-workspace-demo',
    },
  })
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

function lessonStartMs(booking: Booking) {
  const date = booking.requestedDate
  const time = booking.requestedTime
  const timeZone = booking.timezone || 'Europe/Moscow'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
  } catch {
    return null
  }

  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
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
    return null
  }

  return instantMs
}

function videoRoomWindowError(booking: Booking, nowMs = Date.now()) {
  const startMs = lessonStartMs(booking)
  const durationMinutes = Number(booking.durationMinutes)
  if (startMs === null || !Number.isFinite(durationMinutes)) {
    return 'В заявке не удалось определить время занятия.'
  }

  const opensAt = startMs - VIDEO_ROOM_OPEN_BEFORE_MS
  const closesAt =
    startMs + Math.max(30, durationMinutes) * 60 * 1000 + VIDEO_ROOM_CLOSE_AFTER_MS

  if (nowMs < opensAt) {
    return 'Видеокомната откроется за 30 минут до начала занятия.'
  }
  if (nowMs > closesAt) {
    return 'Время доступа к видеокомнате завершилось. Материалы занятия доступны в архиве.'
  }
  return ''
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    return jsonError('Войдите в аккаунт MedStart ещё раз.', 401)
  }

  let body: TokenRequestBody
  try {
    body = (await request.json()) as TokenRequestBody
  } catch {
    return jsonError('Некорректный запрос видеокомнаты.', 400)
  }

  const bookingId =
    typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(bookingId)) {
    return jsonError('Некорректный идентификатор занятия.', 400)
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(
      authorization.slice('Bearer '.length),
      true,
    )
    const database = getFirebaseAdminDb()
    const [snapshot, userSnapshot] = await Promise.all([
      database.collection('bookings').doc(bookingId).get(),
      database.collection('users').doc(decoded.uid).get(),
    ])

    if (!snapshot.exists) {
      return jsonError('Занятие не найдено.', 404)
    }
    if (!userSnapshot.exists || userSnapshot.data()?.status !== 'active') {
      return jsonError('Аккаунт не имеет доступа к видеокомнате.', 403)
    }

    const booking = {
      id: snapshot.id,
      ...snapshot.data(),
    } as Booking

    const participantRole =
      decoded.uid === booking.studentUid
        ? 'student'
        : decoded.uid === booking.tutorUid
          ? 'tutor'
          : null

    if (!participantRole) {
      return jsonError('У вас нет доступа к этому занятию.', 403)
    }
    if (booking.status !== 'accepted') {
      return jsonError(
        'Онлайн-комната доступна после подтверждения занятия.',
        409,
      )
    }
    if (booking.format !== 'online') {
      return jsonError('Это занятие запланировано в очном формате.', 409)
    }

    // До подключения собственного видеосервера MedStart намеренно работает
    // в защищённом режиме медицинской доски. Наличие старых LIVEKIT_* secrets
    // больше не заставляет клиент подключаться к недоступному серверу.
    if (!isVideoServerEnabled()) {
      return demoResponse(booking)
    }

    const windowError = videoRoomWindowError(booking)
    if (windowError) return jsonError(windowError, 409)

    const participantName =
      participantRole === 'student' ? booking.studentName : booking.tutorName

    try {
      const credentials = await createLessonToken({
        booking,
        participantUid: decoded.uid,
        participantName,
        participantRole,
      })

      return NextResponse.json(credentials, {
        headers: { 'Cache-Control': 'no-store' },
      })
    } catch (error) {
      if (!isLiveKitConfigurationError(error)) {
        throw error
      }

      return demoResponse(booking)
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Не удалось подготовить видеокомнату.'
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : ''
    const configurationError =
      message.includes('ещё не') ||
      message.includes('FIREBASE_') ||
      message.includes('LIVEKIT_')

    if (code.startsWith('auth/')) {
      return jsonError('Сессия устарела. Войдите в MedStart ещё раз.', 401)
    }

    return jsonError(
      configurationError
        ? message
        : 'Не удалось проверить доступ к видеокомнате. Повторите попытку.',
      configurationError ? 503 : 500,
    )
  }
}
