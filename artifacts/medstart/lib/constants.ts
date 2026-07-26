export const APP_NAME = 'MedStart' as const
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medstart.app'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: { STUDENT: '/register/student', TUTOR: '/register/tutor' },
  DASHBOARD: '/dashboard',
  LESSON: (bookingId: string) =>
    `/lesson/${encodeURIComponent(bookingId)}` as const,
  TUTORS: '/dashboard/tutors',
  REQUESTS: '/dashboard/requests',
  SCHEDULE: '/dashboard/schedule',
  STUDENTS: '/dashboard/students',
  MESSAGES: '/dashboard/messages',
  MATERIALS: '/dashboard/materials',
  KNOWLEDGE: '/dashboard/knowledge',
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings',
  ADMIN: '/dashboard/admin',
} as const

export const USER_ROLES = {
  STUDENT: 'student',
  TUTOR: 'tutor',
  ADMIN: 'admin',
} as const
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const MS = {
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
  WEEK: 604_800_000,
} as const
export const TOAST_DURATION = 4_500
export const TOAST_MAX = 5
export const BREAKPOINTS = {
  XS: 480,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
} as const
export const MAX_UPLOAD_SIZE_MB = 10
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]
