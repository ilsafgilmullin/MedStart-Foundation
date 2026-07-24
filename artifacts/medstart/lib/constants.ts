// ─── App identity ───────────────────────────────────────────────────────────

export const APP_NAME = 'MedStart' as const
export const APP_DESCRIPTION =
  'The modern platform connecting medical students and educators.' as const
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medstart.app'

// ─── Routes ─────────────────────────────────────────────────────────────────

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: {
    STUDENT: '/register/student',
    TEACHER: '/register/teacher',
  },
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
} as const

// ─── User roles ─────────────────────────────────────────────────────────────

export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
} as const

// ─── Pagination ─────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE     = 100

// ─── Time ───────────────────────────────────────────────────────────────────

export const MS = {
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR:   3_600_000,
  DAY:    86_400_000,
  WEEK:   604_800_000,
} as const

// ─── Toast ───────────────────────────────────────────────────────────────────

export const TOAST_DURATION = 4_500
export const TOAST_MAX      = 5

// ─── Media ──────────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  XS:  480,
  SM:  640,
  MD:  768,
  LG:  1024,
  XL:  1280,
  XXL: 1536,
} as const

export const MAX_UPLOAD_SIZE_MB = 10
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
