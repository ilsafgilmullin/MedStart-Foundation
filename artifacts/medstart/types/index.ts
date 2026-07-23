// ---------------------------------------------------------------------------
// Shared domain types
// ---------------------------------------------------------------------------

export type UserRole = 'student' | 'teacher'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  createdAt: Date
}

export interface Student extends User {
  role: 'student'
  /** e.g. "Medicine", "Nursing" */
  fieldOfStudy?: string
  year?: number
}

export interface Teacher extends User {
  role: 'teacher'
  institution?: string
  specialization?: string
}

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
