// ═══════════════════════════════════════════════════════════════════
// BASE MODELS — MedStart domain types
//
// These are structural types only. No business logic lives here.
// All models are plain TypeScript interfaces (no class inheritance).
// ═══════════════════════════════════════════════════════════════════

// ─── Identifiers ────────────────────────────────────────────────────────────

export type ID     = string        // UUID v4
export type Slug   = string        // URL-safe identifier
export type Email  = string        // Validated email string
export type ISODate = string       // ISO 8601 datetime string

// ─── User roles ──────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'teacher' | 'admin'

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification'

// ─── Base User ───────────────────────────────────────────────────────────────

export interface User {
  id:         ID
  email:      Email
  role:       UserRole
  status:     UserStatus
  firstName:  string
  lastName:   string
  displayName: string | null
  avatarUrl:  string | null
  timezone:   string
  locale:     string
  createdAt:  ISODate
  updatedAt:  ISODate
  lastSeenAt: ISODate | null
}

export type UserPreview = Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'role'>

// ─── Student ─────────────────────────────────────────────────────────────────

export type StudyYear = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface Student extends User {
  role: 'student'
  profile: StudentProfile
}

export interface StudentProfile {
  userId:        ID
  fieldOfStudy:  string | null        // e.g. "Medicine", "Nursing", "Pharmacy"
  studyYear:     StudyYear | null
  institution:   string | null
  graduationYear: number | null
  interests:     string[]             // Medical specialties of interest
  bio:           string | null
}

// ─── Teacher ─────────────────────────────────────────────────────────────────

export type TeacherVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface Teacher extends User {
  role: 'teacher'
  profile: TeacherProfile
}

export interface TeacherProfile {
  userId:             ID
  title:              string | null     // e.g. "Dr.", "Prof."
  specialization:     string | null     // e.g. "Cardiology"
  institution:        string | null
  licenseNumber:      string | null
  yearsOfExperience:  number | null
  bio:                string | null
  verificationStatus: TeacherVerificationStatus
  verifiedAt:         ISODate | null
}

// ─── Shared primitives ────────────────────────────────────────────────────────

export interface Address {
  line1:      string
  line2?:     string
  city:       string
  state?:     string
  postalCode: string
  country:    string  // ISO 3166-1 alpha-2
}

export interface PaginationParams {
  page:    number
  limit:   number
  cursor?: string
}

export interface PaginatedResponse<T> {
  data:       T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
  hasMore:    boolean
}

// ─── Async state machine ─────────────────────────────────────────────────────

export type AsyncState<T, E = string> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E }

// ─── API response envelope ───────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data:    T | null
  error:   ApiError | null
  meta?:   Record<string, unknown>
}

export interface ApiError {
  code:    string
  message: string
  details: Record<string, string[]> | null
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface SelectOption<V = string> {
  label:    string
  value:    V
  disabled?: boolean
  icon?:    React.ReactNode
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface NavigationItem {
  label:  string
  href:   string
  icon?:  React.ReactNode
  badge?: string | number
  children?: NavigationItem[]
}
