export type UserRole = 'student' | 'tutor' | 'admin'
export type EffectiveUserRole = UserRole | 'owner'
export type UserStatus = 'pending' | 'active' | 'blocked' | 'deleted'

export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  role: UserRole
  status: UserStatus
  avatar: string
  fieldOfStudy?: string
  studyYear?: string
  title?: string
  specialization?: string
  institution?: string
  experience?: string
  licenceNumber?: string
  bio?: string
  lessonPrice?: number
  rating?: number
  reviewsCount?: number
  isPublic: boolean
  onboardingCompleted: boolean
  createdAt?: unknown
  updatedAt?: unknown
}
