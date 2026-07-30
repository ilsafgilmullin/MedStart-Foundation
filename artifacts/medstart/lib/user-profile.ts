import type { LearnerTrack, SchoolExam } from './education'

export type UserRole = 'student' | 'tutor' | 'admin'
export type EffectiveUserRole = UserRole | 'owner'
export type UserStatus =
  'pending' | 'active' | 'rejected' | 'blocked' | 'deleted'
export type LessonFormat = 'online' | 'in_person'

export interface NotificationPreferences {
  bookingUpdates: boolean
  newMessages: boolean
  lessonReminders: boolean
  productNews: boolean
}

export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  role: UserRole
  status: UserStatus
  statusBeforeBlock?: UserStatus | ''
  avatar: string
  learnerTrack?: LearnerTrack
  fieldOfStudy?: string
  studyYear?: string
  schoolGrade?: string
  schoolExam?: SchoolExam
  schoolConsentConfirmed?: boolean
  title?: string
  specialization?: string
  subjects?: string[]
  tutorAudiences?: LearnerTrack[]
  examTypes?: SchoolExam[]
  institution?: string
  experience?: string
  bio?: string
  city?: string
  lessonPrice?: number
  lessonDuration?: number
  lessonFormats?: LessonFormat[]
  timezone?: string
  rating?: number
  reviewsCount?: number
  isPublic: boolean
  notificationPreferences?: NotificationPreferences
  moderationNote?: string
  moderatedBy?: string
  moderatedAt?: unknown
  onboardingCompleted: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

export interface TutorPrivateProfile {
  tutorUid: string
  qualificationReference: string
  updatedAt?: unknown
}
