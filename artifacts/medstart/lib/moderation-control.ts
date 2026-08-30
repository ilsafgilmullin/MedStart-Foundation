import { auth } from './firebase'
import type {
  KnowledgeDiscipline,
  KnowledgeLevel,
  KnowledgeResourceKind,
  KnowledgeSourceMode,
} from './domain'
import type { LearnerTrack, SchoolExam } from './education'

export type ModeratorActorRole = 'owner' | 'admin' | 'moderator'
export type TutorModerationStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'suspended'
export type TutorModerationDecision =
  | 'approve'
  | 'reject'
  | 'suspend'
  | 'reinstate'

export interface ModerationTutorRecord {
  uid: string
  displayName: string
  avatar: string
  status: TutorModerationStatus
  isPublic: boolean
  specialization: string
  subjects: string[]
  tutorAudiences: LearnerTrack[]
  examTypes: SchoolExam[]
  institution: string
  experience: string
  bio: string
  city: string
  moderationNote: string
  qualificationReference: string
  updatedAt: string
}

export interface ModerationKnowledgeRecord {
  id: string
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
  securityStatus: string
  malwareScanStatus: string
  storageState: string
  submittedByUid: string
  submittedByName: string
  rightsConfirmed: boolean
  medicalConfirmed: boolean
  noPatientDataConfirmed: boolean
  createdAt: string
}

export interface ModerationOverview {
  ok: true
  actor: {
    uid: string
    role: ModeratorActorRole
    displayName: string
    email: string
  }
  stats: {
    pendingTutors: number
    activeTutors: number
    suspendedTutors: number
    pendingKnowledge: number
  }
  tutors: ModerationTutorRecord[]
  knowledge: ModerationKnowledgeRecord[]
  generatedAt: string
}

interface ApiPayload {
  ok?: boolean
  error?: string
  message?: string
}

async function token() {
  const current = auth.currentUser
  if (!current) throw new Error('Сессия сотрудника отсутствует.')
  return current.getIdToken()
}

async function request<T extends ApiPayload>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const authorization = await token()
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${authorization}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  const payload = (await response.json().catch(() => ({}))) as T
  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.error || 'Операция модерации не выполнена.')
  }
  return payload
}

export function fetchModerationOverview() {
  return request<ModerationOverview>('/api/moderation/overview')
}

export function moderateTutor(input: {
  targetUid: string
  decision: TutorModerationDecision
  note?: string
}) {
  return request<ApiPayload>('/api/moderation/tutors', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function moderateKnowledge(input: {
  submissionId: string
  decision: 'approve' | 'reject'
  note?: string
}) {
  return request<ApiPayload>('/api/knowledge/moderation', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
