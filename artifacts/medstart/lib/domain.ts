import type { LessonFormat } from './user-profile'
import type { LearnerTrack, SchoolExam } from './education'

export type BookingStatus =
  'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'

export interface Booking {
  id: string
  studentUid: string
  studentName: string
  studentAvatar: string
  tutorUid: string
  tutorName: string
  tutorAvatar: string
  learnerTrack?: LearnerTrack
  schoolExam?: SchoolExam
  schoolGrade?: string
  subject: string
  goal: string
  requestedDate: string
  requestedTime: string
  timezone: string
  requestedStartAt?: unknown
  requestedEndAt?: unknown
  durationMinutes: number
  format: LessonFormat
  price: number
  status: BookingStatus
  studentMessage: string
  tutorResponse: string
  conversationId: string
  createdAt?: unknown
  updatedAt?: unknown
  confirmedAt?: unknown
  completedAt?: unknown
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface AvailabilityDay {
  enabled: boolean
  start: string
  end: string
}

export interface TutorAvailability {
  tutorUid: string
  timezone: string
  days: Record<Weekday, AvailabilityDay>
  updatedAt?: unknown
}

export interface Conversation {
  id: string
  participantUids: string[]
  participantNames: Record<string, string>
  participantAvatars: Record<string, string>
  latestBookingId: string
  lastMessage: string
  lastSenderUid: string
  lastMessageAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

export type ChatMessageKind =
  'text' | 'voice' | 'video_note' | 'file' | 'medical_note'

export type MedicalMessageTag =
  '' | 'clinical_case' | 'homework' | 'ecg' | 'lab' | 'important' | 'medication'

export type MedicalReactionCode =
  'heart' | 'brain' | 'stethoscope' | 'dna' | 'pill' | 'check'

export interface ChatMessage {
  id: string
  senderUid: string
  senderName: string
  senderRole: 'student' | 'tutor' | 'admin' | 'owner'
  kind: ChatMessageKind
  text: string
  medicalTag: MedicalMessageTag
  mediaPath: string
  mimeType: string
  fileName: string
  fileSize: number
  durationMs: number
  reactions: Record<string, MedicalReactionCode>
  createdAt?: unknown
}

export type WhiteboardElementKind =
  'pen' | 'marker' | 'eraser' | 'line' | 'rectangle' | 'ellipse' | 'text'

export interface WhiteboardPoint {
  x: number
  y: number
}

export interface WhiteboardElement {
  id: string
  kind: WhiteboardElementKind
  color: string
  size: number
  opacity: number
  authorUid: string
  authorName: string
  points: WhiteboardPoint[]
  x: number
  y: number
  endX: number
  endY: number
  text: string
  createdAtMs: number
  createdAt?: unknown
  updatedAt?: unknown
}

export type MaterialKind = 'link' | 'document' | 'video' | 'note'

export interface LearningMaterial {
  id: string
  bookingId: string
  tutorUid: string
  tutorName: string
  studentUid: string
  studentName: string
  title: string
  description: string
  url: string
  kind: MaterialKind
  createdAt?: unknown
  updatedAt?: unknown
}

export type KnowledgeResourceKind =
  | 'book'
  | 'clinical_guideline'
  | 'instruction'
  | 'standard'
  | 'checklist'
  | 'video'
  | 'article'

export type KnowledgeDiscipline =
  | 'general'
  | 'anatomy'
  | 'physiology'
  | 'pharmacology'
  | 'therapy'
  | 'surgery'
  | 'pediatrics'
  | 'nursing'
  | 'emergency'
  | 'accreditation'

export type KnowledgeLevel = 'all' | 'college' | 'university' | 'residency'

export type KnowledgeSubmissionStatus = 'pending' | 'published' | 'rejected'

export type KnowledgeSourceMode = 'link' | 'file'

export interface OfficialKnowledgeResource {
  id: string
  origin: 'official'
  status: 'published'
  title: string
  description: string
  kind: KnowledgeResourceKind
  discipline: KnowledgeDiscipline
  level: KnowledgeLevel
  author: string
  publicationLabel: string
  sourceName: string
  sourceUrl: string
  language: 'ru' | 'en'
  verifiedAt: string
  tags: string[]
  featured?: boolean
}

export interface KnowledgeSubmission {
  id: string
  origin: 'tutor'
  status: KnowledgeSubmissionStatus
  title: string
  description: string
  kind: KnowledgeResourceKind
  discipline: KnowledgeDiscipline
  level: KnowledgeLevel
  author: string
  publicationYear: string
  sourceMode: KnowledgeSourceMode
  sourceUrl: string
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  sha256?: string
  securityStatus?: 'link-validated' | 'signature-verified'
  malwareScanStatus?: 'not-applicable' | 'not-configured'
  storageState?: 'not-applicable' | 'quarantined' | 'published' | 'legacy'
  submittedByUid: string
  submittedByName: string
  rightsConfirmed: boolean
  medicalConfirmed: boolean
  noPatientDataConfirmed: boolean
  moderationNote: string
  moderatedBy: string
  moderatedAt?: unknown
  publishedAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

interface TimestampLike {
  toMillis?: () => number
  toDate?: () => Date
  seconds?: number
}

export function timestampToMillis(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  const timestamp = value as TimestampLike
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis()
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime()
  }
  if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1_000
  return 0
}

function zonedDateTimeToMillis(
  date: string,
  time: string,
  timeZone: string,
): number {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time || '00:00')
  if (!dateMatch || !timeMatch) return 0

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

  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: timeZone || 'Europe/Moscow',
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
  } catch {
    const localFallback = Date.parse(`${date}T${time || '00:00'}:00`)
    return Number.isNaN(localFallback) ? 0 : localFallback
  }
}

export function bookingDateTime(booking: Booking): number {
  const authoritative = timestampToMillis(booking.requestedStartAt)
  if (authoritative) return authoritative
  return zonedDateTimeToMillis(
    booking.requestedDate,
    booking.requestedTime,
    booking.timezone || 'Europe/Moscow',
  )
}

export function sortBookings(items: Booking[]): Booking[] {
  return [...items].sort((left, right) => {
    const leftDate = bookingDateTime(left)
    const rightDate = bookingDateTime(right)
    return (
      rightDate - leftDate ||
      timestampToMillis(right.createdAt) - timestampToMillis(left.createdAt)
    )
  })
}

export function formatLessonDate(
  date: string,
  time: string,
  options: Intl.DateTimeFormatOptions = {},
  timeZone = 'Europe/Moscow',
): string {
  const millis = zonedDateTimeToMillis(date, time, timeZone)
  if (!millis) return `${date} ${time}`.trim()

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    ...options,
  }).format(new Date(millis))
}

export function formatBookingDate(
  booking: Booking,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const authoritative = timestampToMillis(booking.requestedStartAt)
  if (authoritative) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: booking.timezone || 'Europe/Moscow',
      ...options,
    }).format(new Date(authoritative))
  }
  return formatLessonDate(
    booking.requestedDate,
    booking.requestedTime,
    options,
    booking.timezone || 'Europe/Moscow',
  )
}

export function formatMessageTime(value: unknown): string {
  const millis = timestampToMillis(value)
  if (!millis) return 'сейчас'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(millis))
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Ожидает ответа',
  accepted: 'Подтверждено',
  declined: 'Отклонено',
  cancelled: 'Отменено',
  completed: 'Завершено',
}

export const WEEKDAYS: Array<{ key: Weekday; label: string; short: string }> = [
  { key: 'monday', label: 'Понедельник', short: 'Пн' },
  { key: 'tuesday', label: 'Вторник', short: 'Вт' },
  { key: 'wednesday', label: 'Среда', short: 'Ср' },
  { key: 'thursday', label: 'Четверг', short: 'Чт' },
  { key: 'friday', label: 'Пятница', short: 'Пт' },
  { key: 'saturday', label: 'Суббота', short: 'Сб' },
  { key: 'sunday', label: 'Воскресенье', short: 'Вс' },
]

export const DEFAULT_AVAILABILITY: TutorAvailability['days'] = {
  monday: { enabled: true, start: '10:00', end: '19:00' },
  tuesday: { enabled: true, start: '10:00', end: '19:00' },
  wednesday: { enabled: true, start: '10:00', end: '19:00' },
  thursday: { enabled: true, start: '10:00', end: '19:00' },
  friday: { enabled: true, start: '10:00', end: '19:00' },
  saturday: { enabled: false, start: '10:00', end: '16:00' },
  sunday: { enabled: false, start: '10:00', end: '16:00' },
}

export function conversationIdFor(firstUid: string, secondUid: string): string {
  return [firstUid, secondUid].sort().join('__')
}
