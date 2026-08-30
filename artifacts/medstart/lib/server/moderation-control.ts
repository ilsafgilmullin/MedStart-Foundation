import 'server-only'

import { FieldValue } from 'firebase-admin/firestore'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from './firebase-admin'

export type ModerationActorRole = 'owner' | 'admin' | 'moderator'

export interface ModerationActor {
  uid: string
  email: string
  displayName: string
  role: ModerationActorRole
}

export class ModerationAccessError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ModerationAccessError'
  }
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''
}

export async function requireModerationActor(
  request: Request,
): Promise<ModerationActor> {
  const token = bearerToken(request)
  if (!token) {
    throw new ModerationAccessError(401, 'AUTH_REQUIRED', 'Требуется авторизация.')
  }

  let decoded
  try {
    decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
  } catch {
    throw new ModerationAccessError(
      401,
      'SESSION_INVALID',
      'Сессия устарела. Войдите повторно.',
    )
  }

  if (!decoded.email_verified) {
    throw new ModerationAccessError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Подтвердите электронную почту.',
    )
  }

  const snapshot = await getFirebaseAdminDb()
    .collection('users')
    .doc(decoded.uid)
    .get()
  if (!snapshot.exists) {
    throw new ModerationAccessError(
      403,
      'PROFILE_MISSING',
      'Профиль сотрудника не найден.',
    )
  }

  const profile = snapshot.data() as {
    role?: string
    status?: string
    displayName?: string
    email?: string
  }
  if (profile.status !== 'active') {
    throw new ModerationAccessError(
      403,
      'ACCOUNT_UNAVAILABLE',
      'Аккаунт сотрудника неактивен.',
    )
  }

  const role: ModerationActorRole | null =
    decoded.uid === PRIMARY_OWNER_UID
      ? 'owner'
      : profile.role === 'admin' || profile.role === 'moderator'
        ? profile.role
        : null
  if (!role) {
    throw new ModerationAccessError(
      403,
      'MODERATOR_REQUIRED',
      'Недостаточно прав для модерации.',
    )
  }

  return {
    uid: decoded.uid,
    email: String(decoded.email || profile.email || ''),
    displayName: String(
      profile.displayName || decoded.name || decoded.email || 'Модератор MedStart',
    ).slice(0, 160),
    role,
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

export async function writeModerationAudit(input: {
  actor: ModerationActor
  action: string
  summary: string
  targetUid?: string
  targetType?: string
  metadata?: Record<string, unknown>
}) {
  await getFirebaseAdminDb().collection('adminAuditLogs').add({
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

export function moderationErrorResponse(error: unknown) {
  if (error instanceof ModerationAccessError) {
    return {
      status: error.status,
      body: { ok: false, code: error.code, error: error.message },
    }
  }
  if (error instanceof Error) {
    console.error('MedStart moderation operation failed', error)
    return {
      status: 400,
      body: {
        ok: false,
        code: 'MODERATION_OPERATION_REJECTED',
        error: error.message,
      },
    }
  }
  console.error('MedStart moderation operation failed', error)
  return {
    status: 500,
    body: {
      ok: false,
      code: 'MODERATION_OPERATION_FAILED',
      error: 'Не удалось выполнить операцию модерации.',
    },
  }
}
