import 'server-only'

import { FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'

export type AdminActorRole = 'owner' | 'admin'

export interface AdminActor {
  uid: string
  email: string
  displayName: string
  role: AdminActorRole
}

export class AdminAccessError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'AdminAccessError'
    this.status = status
    this.code = code
  }
}

function bearerToken(request: Request) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

export async function requireAdminActor(request: Request): Promise<AdminActor> {
  const token = bearerToken(request)
  if (!token) {
    throw new AdminAccessError(401, 'AUTH_REQUIRED', 'Требуется авторизация.')
  }

  const auth = getFirebaseAdminAuth()
  let decoded
  try {
    decoded = await auth.verifyIdToken(token, true)
  } catch {
    throw new AdminAccessError(401, 'SESSION_INVALID', 'Сессия устарела. Войдите повторно.')
  }

  const db = getFirebaseAdminDb()
  const profileSnapshot = await db.collection('users').doc(decoded.uid).get()
  if (!profileSnapshot.exists) {
    throw new AdminAccessError(403, 'PROFILE_MISSING', 'Профиль администратора не найден.')
  }

  const profile = profileSnapshot.data() as {
    role?: string
    status?: string
    displayName?: string
    email?: string
  }
  if (profile.status !== 'active') {
    throw new AdminAccessError(403, 'ACCOUNT_UNAVAILABLE', 'Административный аккаунт неактивен.')
  }

  const role: AdminActorRole | null =
    decoded.uid === PRIMARY_OWNER_UID
      ? 'owner'
      : profile.role === 'admin'
        ? 'admin'
        : null
  if (!role) {
    throw new AdminAccessError(403, 'ADMIN_REQUIRED', 'Недостаточно прав для этого раздела.')
  }

  return {
    uid: decoded.uid,
    email: String(decoded.email || profile.email || ''),
    displayName: String(profile.displayName || decoded.name || decoded.email || 'Администратор'),
    role,
  }
}

export function requireOwner(actor: AdminActor) {
  if (actor.role !== 'owner') {
    throw new AdminAccessError(403, 'OWNER_REQUIRED', 'Это действие доступно только владельцу MedStart.')
  }
}

export function assertTargetIsNotOwner(targetUid: string) {
  if (targetUid === PRIMARY_OWNER_UID) {
    throw new AdminAccessError(403, 'OWNER_PROTECTED', 'Аккаунт владельца защищён от изменений.')
  }
}

function cleanMetadata(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.slice(0, 1_000)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 20).map(cleanMetadata)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([key, item]) => [key.slice(0, 120), cleanMetadata(item)]),
    )
  }
  return String(value).slice(0, 1_000)
}

export async function writeAdminAudit(input: {
  actor: AdminActor
  action: string
  summary: string
  targetUid?: string
  targetType?: string
  metadata?: Record<string, unknown>
}) {
  const db = getFirebaseAdminDb()
  await db.collection('adminAuditLogs').add({
    actorUid: input.actor.uid,
    actorName: input.actor.displayName,
    actorEmail: input.actor.email,
    actorRole: input.actor.role,
    action: input.action.slice(0, 120),
    summary: input.summary.slice(0, 1_000),
    targetUid: (input.targetUid || '').slice(0, 160),
    targetType: (input.targetType || '').slice(0, 120),
    metadata: cleanMetadata(input.metadata || {}),
    createdAt: FieldValue.serverTimestamp(),
  })
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError) {
    return { status: error.status, body: { ok: false, code: error.code, error: error.message } }
  }
  if (error instanceof Error) {
    console.error('MedStart admin operation failed', error)
    return {
      status: 400,
      body: { ok: false, code: 'ADMIN_OPERATION_REJECTED', error: error.message },
    }
  }
  console.error('MedStart admin operation failed', error)
  return {
    status: 500,
    body: { ok: false, code: 'ADMIN_OPERATION_FAILED', error: 'Не удалось выполнить административную операцию.' },
  }
}
