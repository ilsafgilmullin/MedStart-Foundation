import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import {
  sortBookings,
  type Booking,
  type BookingStatus,
} from './domain'
import type {
  EffectiveUserRole,
  LessonFormat,
  UserProfile,
} from './user-profile'

export interface CreateBookingInput {
  student: UserProfile
  tutor: UserProfile
  subject: string
  goal: string
  requestedDate: string
  requestedTime: string
  format: LessonFormat
  message: string
}

export interface BookingActionInput {
  bookingId: string
  actorUid: string
  nextStatus: Extract<
    BookingStatus,
    'accepted' | 'declined' | 'cancelled' | 'completed'
  >
  response?: string
}

interface CreateBookingResponse {
  bookingId?: string
  conversationId?: string
  error?: string
}

function clean(value: string) {
  return value.trim()
}

function defaultTimezone(profile: UserProfile) {
  return profile.timezone || 'Europe/Moscow'
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<{ bookingId: string; conversationId: string }> {
  if (input.student.role !== 'student' || input.student.status !== 'active') {
    throw new Error('Запись доступна только активному аккаунту студента.')
  }
  if (
    input.tutor.role !== 'tutor' ||
    input.tutor.status !== 'active' ||
    !input.tutor.isPublic
  ) {
    throw new Error('Этот репетитор пока недоступен для записи.')
  }

  const subject = clean(input.subject)
  const requestedDate = clean(input.requestedDate)
  const requestedTime = clean(input.requestedTime)
  if (!subject || !requestedDate || !requestedTime) {
    throw new Error('Укажите предмет, дату и время занятия.')
  }

  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.student.uid) {
    throw new Error('Сессия авторизации устарела. Войдите в аккаунт повторно.')
  }

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tutorUid: input.tutor.uid,
      subject,
      goal: clean(input.goal),
      requestedDate,
      requestedTime,
      timezone: defaultTimezone(input.student),
      format: input.format,
      message: clean(input.message),
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as CreateBookingResponse
  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось отправить заявку.')
  }
  if (!payload.bookingId || !payload.conversationId) {
    throw new Error('Сервер вернул неполный ответ при создании заявки.')
  }

  return {
    bookingId: payload.bookingId,
    conversationId: payload.conversationId,
  }
}

export function subscribeToBookingsForUser(
  uid: string,
  role: EffectiveUserRole,
  onChange: (bookings: Booking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source =
    role === 'tutor'
      ? query(collection(db, 'bookings'), where('tutorUid', '==', uid))
      : role === 'student'
        ? query(collection(db, 'bookings'), where('studentUid', '==', uid))
        : collection(db, 'bookings')

  return onSnapshot(
    source,
    (snapshot) =>
      onChange(
        sortBookings(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as Booking,
          ),
        ),
      ),
    onError,
  )
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const snapshot = await getDoc(doc(db, 'bookings', bookingId))
  return snapshot.exists()
    ? ({ id: snapshot.id, ...snapshot.data() } as Booking)
    : null
}

export async function changeBookingStatus(
  input: BookingActionInput,
): Promise<void> {
  const bookingRef = doc(db, 'bookings', input.bookingId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(bookingRef)
    if (!snapshot.exists()) throw new Error('Заявка не найдена.')

    const booking = { id: snapshot.id, ...snapshot.data() } as Booking
    const tutorAction =
      input.actorUid === booking.tutorUid &&
      ((booking.status === 'pending' &&
        (input.nextStatus === 'accepted' || input.nextStatus === 'declined')) ||
        (booking.status === 'accepted' && input.nextStatus === 'completed'))
    const studentAction =
      input.actorUid === booking.studentUid &&
      (booking.status === 'pending' || booking.status === 'accepted') &&
      input.nextStatus === 'cancelled'

    if (!tutorAction && !studentAction) {
      throw new Error('Это действие недоступно для текущего статуса занятия.')
    }

    const patch: Record<string, unknown> = {
      status: input.nextStatus,
      updatedAt: serverTimestamp(),
    }

    if (input.nextStatus === 'accepted') {
      patch.confirmedAt = serverTimestamp()
      patch.tutorResponse = clean(input.response ?? '')
    }
    if (input.nextStatus === 'declined') {
      patch.tutorResponse = clean(input.response ?? '')
    }
    if (input.nextStatus === 'completed') {
      patch.completedAt = serverTimestamp()
    }

    transaction.update(bookingRef, patch)
  })
}
