import type { LessonFormat } from './user-profile'

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
  | 'text'
  | 'voice'
  | 'video_note'
  | 'file'
  | 'medical_note'

export type MedicalMessageTag =
  | ''
  | 'clinical_case'
  | 'homework'
  | 'ecg'
  | 'lab'
  | 'important'
  | 'medication'

export type MedicalReactionCode =
  | 'heart'
  | 'brain'
  | 'stethoscope'
  | 'dna'
  | 'pill'
  | 'check'

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
  createdAt?: unknown
}

export interface ChatReaction {
  id: string
  conversationId: string
  messageId: string
  uid: string
  code: MedicalReactionCode
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

  let guess = Date.UTC(year, month - 1, day, hour, minute)
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    )
    const displayedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    guess -= displayedAsUtc - guess
  } catch {
    return guess
  }
  return guess
}

export function bookingStartMillis(booking: Booking): number {
  const fromTimestamp = timestampToMillis(booking.requestedStartAt)
  if (fromTimestamp) return fromTimestamp
  return zonedDateTimeToMillis(
    booking.requestedDate,
    booking.requestedTime,
    booking.timezone,
  )
}

export function sortBookings(items: Booking[]): Booking[] {
  return [...items].sort((left, right) => {
    const statusWeight: Record<BookingStatus, number> = {
      pending: 0,
      accepted: 1,
      completed: 2,
      declined: 3,
      cancelled: 4,
    }
    return (
      statusWeight[left.status] - statusWeight[right.status] ||
      bookingStartMillis(left) - bookingStartMillis(right) ||
      timestampToMillis(right.createdAt) - timestampToMillis(left.createdAt)
    )
  })
}

export function formatMessageTime(value: unknown): string {
  const millis = timestampToMillis(value)
  if (!millis) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(millis))
}
