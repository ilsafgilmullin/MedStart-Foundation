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

function clean(value: string) {
  return value.trim()
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<{ bookingId: string; conversationId: string }> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.student.uid) {
    throw new Error('Сессия устарела. Войдите в MedStart ещё раз.')
  }
  if (input.student.role !== 'student' || input.student.status !== 'active') {
    throw new Error('Запись доступна только активному аккаунту студента.')
  }

  const subject = clean(input.subject)
  const requestedDate = clean(input.requestedDate)
  const requestedTime = clean(input.requestedTime)
  if (!subject || !requestedDate || !requestedTime) {
    throw new Error('Укажите предмет, дату и время занятия.')
  }

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings/create', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      tutorUid: input.tutor.uid,
      subject,
      goal: clean(input.goal),
      requestedDate,
      requestedTime,
      format: input.format,
      message: clean(input.message),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    bookingId?: string
    conversationId?: string
  }
  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось создать заявку.')
  }
  if (!payload.bookingId || !payload.conversationId) {
    throw new Error('Сервер вернул неполные данные заявки.')
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
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.actorUid) {
    throw new Error('Сессия устарела. Войдите в MedStart ещё раз.')
  }
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings/status', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      bookingId: input.bookingId,
      nextStatus: input.nextStatus,
      response: clean(input.response ?? ''),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  }
  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось обновить занятие.')
  }
}
