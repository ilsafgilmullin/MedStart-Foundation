import 'server-only'

import {
  FieldValue,
  type DocumentReference,
} from 'firebase-admin/firestore'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'

export type AdminActorRole = 'owner' | 'admin'
export type AdminAuditOperationStatus = 'started' | 'succeeded' | 'failed'

export interface AdminActor {
  uid: string
  email: string
  displayName: string
  role: AdminActorRole
}

export interface AdminAuditInput {
  actor: AdminActor
  action: string
  summary: string
  targetUid?: string
  targetType?: string
  metadata?: Record<string, unknown>
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
    displayName: String(
      profile.displayName || decoded.name || decoded.email || 'Администратор',
    ),
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

function auditFailureMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 1_000)
    : String(error).slice(0, 1_000)
}

export function buildAdminAuditData(
  input: AdminAuditInput,
  operationStatus: AdminAuditOperationStatus = 'succeeded',
) {
  return {
    actorUid: input.actor.uid,
    actorName: input.actor.displayName.slice(0, 160),
    actorEmail: input.actor.email.slice(0, 320),
    actorRole: input.actor.role,
    action: input.action.slice(0, 120),
    summary: input.summary.slice(0, 1_000),
    targetUid: (input.targetUid || '').slice(0, 160),
    targetType: (input.targetType || '').slice(0, 120),
    metadata: cleanMetadata(input.metadata || {}),
    operationStatus,
    createdAt: FieldValue.serverTimestamp(),
    completedAt:
      operationStatus === 'started' ? null : FieldValue.serverTimestamp(),
  }
}

export async function writeAdminAudit(input: AdminAuditInput) {
  const db = getFirebaseAdminDb()
  await db.collection('adminAuditLogs').add(buildAdminAuditData(input))
}

/**
 * Creates a durable intent record before a privileged side effect that cannot
 * participate in a Firestore transaction (Firebase Auth / Identity Toolkit).
 * If this write fails, the caller must not execute the side effect.
 */
export async function startAdminAudit(
  input: AdminAuditInput,
): Promise<DocumentReference> {
  const reference = getFirebaseAdminDb().collection('adminAuditLogs').doc()
  await reference.create(buildAdminAuditData(input, 'started'))
  return reference
}

/**
 * Finalization is intentionally best-effort: the durable `started` record must
 * survive even if the outcome update is temporarily unavailable. Returning an
 * API error after the external side effect succeeded could cause a dangerous
 * operator retry, so completion failures are surfaced to server logs instead.
 */
export async function completeAdminAudit(
  reference: DocumentReference,
  resultMetadata?: Record<string, unknown>,
) {
  try {
    await reference.update({
      operationStatus: 'succeeded',
      resultMetadata: cleanMetadata(resultMetadata || {}),
      completedAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('MedStart admin audit completion update failed', {
      auditId: reference.id,
      error,
    })
  }
}

/**
 * Failure finalization must never hide the original operation error. If this
 * update also fails, the previously durable `started` record remains as an
 * explicit unknown-outcome trail for incident review.
 */
export async function failAdminAudit(
  reference: DocumentReference,
  error: unknown,
  resultMetadata?: Record<string, unknown>,
) {
  try {
    await reference.update({
      operationStatus: 'failed',
      failureMessage: auditFailureMessage(error),
      resultMetadata: cleanMetadata(resultMetadata || {}),
      completedAt: FieldValue.serverTimestamp(),
    })
  } catch (auditError) {
    console.error('MedStart admin audit failure update failed', {
      auditId: reference.id,
      operationError: error,
      auditError,
    })
  }
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError) {
    return {
      status: error.status,
      body: { ok: false, code: error.code, error: error.message },
    }
  }
  if (error instanceof Error) {
    console.error('MedStart admin operation failed', error)
    return {
      status: 400,
      body: {
        ok: false,
        code: 'ADMIN_OPERATION_REJECTED',
        error: error.message,
      },
    }
  }
  console.error('MedStart admin operation failed', error)
  return {
    status: 500,
    body: {
      ok: false,
      code: 'ADMIN_OPERATION_FAILED',
      error: 'Не удалось выполнить административную операцию.',
    },
  }
}
