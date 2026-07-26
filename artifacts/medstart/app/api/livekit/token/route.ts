import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/domain'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'
import { createLessonToken } from '@/lib/server/livekit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const participantName =
      participantRole === 'student' ? booking.studentName : booking.tutorName
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
