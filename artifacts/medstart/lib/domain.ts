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

export interface ChatMessage {
  id: string
  senderUid: string
  text: string
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

export interface KnowledgeBookmark {
  resourceId: string
  createdAt?: unknown
}

export const WEEKDAYS: Array<{ key: Weekday; label: string; shortLabel: string }> = [
  { key: 'monday', label: 'Понедельник', shortLabel: 'Пн' },
  { key: 'tuesday', label: 'Вторник', shortLabel: 'Вт' },
  { key: 'wednesday', label: 'Среда', shortLabel: 'Ср' },
  { key: 'thursday', label: 'Четверг', shortLabel: 'Чт' },
  { key: 'friday', label: 'Пятница', shortLabel: 'Пт' },
  { key: 'saturday', label: 'Суббота', shortLabel: 'Сб' },
  { key: 'sunday', label: 'Воскресенье', shortLabel: 'Вс' },
]

export const DEFAULT_AVAILABILITY_DAYS: TutorAvailability['days'] = {
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

export function bookingDateTime(booking: Booking): Date {
  const value = `${booking.requestedDate}T${booking.requestedTime}:00`
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

export function sortBookings(bookings: Booking[]): Booking[] {
  return [...bookings].sort(
    (left, right) => bookingDateTime(left).getTime() - bookingDateTime(right).getTime(),
  )
}

export function knowledgeResourceId(resource: OfficialKnowledgeResource | KnowledgeSubmission) {
  return resource.origin === 'official' ? `official:${resource.id}` : `tutor:${resource.id}`
}
