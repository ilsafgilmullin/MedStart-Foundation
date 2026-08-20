import { auth } from './firebase'
import type { BookingStatus } from './domain'
import type { LearnerTrack, SchoolExam } from './education'
import type { UserRole, UserStatus } from './user-profile'

export type AdminActorRole = 'owner' | 'admin' | 'moderator'
export type AdminOverviewTab =
  'overview' | 'moderation' | 'users' | 'bookings' | 'audit' | 'system'

export interface AdminUserRecord {
  uid: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  avatar: string
  role: UserRole | 'owner'
  profileRole: UserRole
  status: UserStatus
  statusBeforeBlock: UserStatus | ''
  specialization: string
  subjects: string[]
  tutorAudiences: LearnerTrack[]
  examTypes: SchoolExam[]
  institution: string
  city: string
  isPublic: boolean
  moderationNote: string
  qualificationReference: string
  createdAt: string
  updatedAt: string
  auth: {
    exists: boolean
    disabled: boolean
    emailVerified: boolean
    createdAt: string
    lastSignInAt: string
  }
}

export interface AdminBookingRecord {
  id: string
  studentUid: string
  studentName: string
  tutorUid: string
  tutorName: string
  subject: string
  requestedDate: string
  requestedTime: string
  timezone: string
  format: string
  price: number
  status: BookingStatus
  createdAt: string
  updatedAt: string
}

export interface AdminAuditRecord {
  id: string
  actorUid: string
  actorName: string
  actorEmail: string
  actorRole: AdminActorRole
  action: string
  summary: string
  targetUid: string
  targetType: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AdminOverviewResponse {
  ok: true
  actor: {
    uid: string
    role: AdminActorRole
    displayName: string
    email: string
  }
  capabilities: {
    ownerControl: boolean
    manageRoles: boolean
    archiveUsers: boolean
    verifyEmails: boolean
    manageBookings: boolean
    viewAudit: boolean
  }
  stats: {
    totalUsers: number
    activeStudents: number
    activeTutors: number
    pendingTutors: number
    rejectedTutors: number
    blockedUsers: number
    archivedUsers: number
    admins: number
    totalBookings: number
    activeBookings: number
    completedBookings: number
    totalMaterials: number
    pendingKnowledge: number
    conversations: number
  }
  users: AdminUserRecord[]
  pendingTutors: AdminUserRecord[]
  bookings: AdminBookingRecord[]
  audit: AdminAuditRecord[]
  system: {
    projectId: string
    firebaseAdmin: boolean
    ownerAuth: boolean
    ownerProfile: boolean
    ownerProtected: boolean
    generatedAt: string
  }
}

export type AdminAction =
  | 'moderate_tutor'
  | 'set_blocked'
  | 'set_role'
  | 'revoke_sessions'
  | 'send_password_reset'
  | 'verify_email'
  | 'archive_user'
  | 'restore_user'
  | 'set_booking_status'

export interface AdminActionInput {
  action: AdminAction
  targetUid?: string
  bookingId?: string
  decision?: 'approve' | 'reject'
  note?: string
  blocked?: boolean
  role?: UserRole
  status?: BookingStatus
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Сессия администратора отсутствует.')
  const token = await currentUser.getIdToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
  }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'Административная операция не выполнена.')
  }
  return payload as T
}

export function fetchAdminControlOverview() {
  return adminRequest<AdminOverviewResponse>('/api/admin/overview')
}

export function runAdminControlAction(input: AdminActionInput) {
  return adminRequest<{ ok: true; message: string }>('/api/admin/action', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
