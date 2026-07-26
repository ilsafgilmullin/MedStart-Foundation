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
  fieldOfStudy?: string
  studyYear?: string
  title?: string
  specialization?: string
  subjects?: string[]
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
