import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  conversationIdFor,
  sortBookings,
  type Booking,
  type BookingStatus,
  type ChatMessage,
  type Conversation,
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

  const bookingRef = doc(collection(db, 'bookings'))
  const conversationId = conversationIdFor(input.student.uid, input.tutor.uid)
  const conversationRef = doc(db, 'conversations', conversationId)
  const conversationSnapshot = await getDoc(conversationRef)
  const messageText =
    clean(input.message) ||
    `Здравствуйте! Хочу записаться на занятие по теме «${subject}».`
  const messageRef = doc(collection(conversationRef, 'messages'))
  const batch = writeBatch(db)

  const booking: Omit<Booking, 'id'> = {
    studentUid: input.student.uid,
    studentName: input.student.displayName,
    studentAvatar: input.student.avatar || '',
    tutorUid: input.tutor.uid,
    tutorName: input.tutor.displayName,
    tutorAvatar: input.tutor.avatar || '',
    subject,
    goal: clean(input.goal),
    requestedDate,
    requestedTime,
    timezone: defaultTimezone(input.student),
    durationMinutes: Math.max(30, input.tutor.lessonDuration ?? 60),
    format: input.format,
    price: Math.max(0, input.tutor.lessonPrice ?? 0),
    status: 'pending',
    studentMessage: messageText,
    tutorResponse: '',
    conversationId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  batch.set(bookingRef, booking)

  const conversationUpdate = {
    latestBookingId: bookingRef.id,
    lastMessage: messageText,
    lastSenderUid: input.student.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (conversationSnapshot.exists()) {
    batch.update(conversationRef, conversationUpdate)
  } else {
    const conversation: Omit<Conversation, 'id'> = {
      participantUids: [input.student.uid, input.tutor.uid],
      participantNames: {
        [input.student.uid]: input.student.displayName,
        [input.tutor.uid]: input.tutor.displayName,
      },
      participantAvatars: {
        [input.student.uid]: input.student.avatar || '',
        [input.tutor.uid]: input.tutor.avatar || '',
      },
      ...conversationUpdate,
      createdAt: serverTimestamp(),
    }
    batch.set(conversationRef, conversation)
  }

  const firstMessage: Omit<ChatMessage, 'id'> = {
    senderUid: input.student.uid,
    text: messageText,
    createdAt: serverTimestamp(),
  }
  batch.set(messageRef, firstMessage)
  await batch.commit()

  return { bookingId: bookingRef.id, conversationId }
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
