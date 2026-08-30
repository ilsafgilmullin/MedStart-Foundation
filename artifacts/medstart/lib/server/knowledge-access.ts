import 'server-only'

import { PRIMARY_OWNER_UID } from '@/lib/access-control'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from './firebase-admin'

export type KnowledgeActorRole =
  | 'student'
  | 'tutor'
  | 'admin'
  | 'moderator'
  | 'owner'

export interface KnowledgeActor {
  uid: string
  name: string
  email: string
  role: KnowledgeActorRole
  moderator: boolean
}

export class KnowledgeAccessError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'KnowledgeAccessError'
  }
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

export async function requireKnowledgeActor(
  request: Request,
): Promise<KnowledgeActor> {
  const token = bearerToken(request)
  if (!token) {
    throw new KnowledgeAccessError(401, 'AUTH_REQUIRED', 'Требуется авторизация.')
  }

  let decoded
  try {
    decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
  } catch {
    throw new KnowledgeAccessError(
      401,
      'SESSION_EXPIRED',
      'Сессия устарела. Войдите повторно.',
    )
  }

  if (!decoded.email_verified) {
    throw new KnowledgeAccessError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Подтвердите электронную почту.',
    )
  }

  const profileSnapshot = await getFirebaseAdminDb()
    .collection('users')
    .doc(decoded.uid)
    .get()
  if (!profileSnapshot.exists) {
    throw new KnowledgeAccessError(
      403,
      'PROFILE_MISSING',
      'Профиль пользователя не найден.',
    )
  }

  const profile = profileSnapshot.data() as {
    role?: string
    status?: string
    displayName?: string
    email?: string
  }
  if (profile.status !== 'active') {
    throw new KnowledgeAccessError(
      403,
      'ACCOUNT_UNAVAILABLE',
      'Аккаунт недоступен.',
    )
  }

  const role: KnowledgeActorRole | null =
    decoded.uid === PRIMARY_OWNER_UID
      ? 'owner'
      : profile.role === 'student' ||
          profile.role === 'tutor' ||
          profile.role === 'admin' ||
          profile.role === 'moderator'
        ? profile.role
        : null
  if (!role) {
    throw new KnowledgeAccessError(
      403,
      'ROLE_UNAVAILABLE',
      'Для этой роли учебная база недоступна.',
    )
  }

  return {
    uid: decoded.uid,
    name: String(
      profile.displayName || decoded.name || decoded.email || 'Пользователь MedStart',
    ).slice(0, 160),
    email: String(decoded.email || profile.email || ''),
    role,
    moderator:
      role === 'owner' || role === 'admin' || role === 'moderator',
  }
}

export function requireTutor(actor: KnowledgeActor) {
  if (actor.role !== 'tutor') {
    throw new KnowledgeAccessError(
      403,
      'TUTOR_REQUIRED',
      'Предлагать материалы может только активный проверенный репетитор.',
    )
  }
}

export function requireModerator(actor: KnowledgeActor) {
  if (!actor.moderator) {
    throw new KnowledgeAccessError(
      403,
      'MODERATOR_REQUIRED',
      'Для этого действия нужны права модератора.',
    )
  }
}

export function knowledgeErrorResponse(error: unknown) {
  if (error instanceof KnowledgeAccessError) {
    return {
      status: error.status,
      body: { ok: false, code: error.code, error: error.message },
    }
  }
  console.error('MedStart knowledge operation failed', error)
  return {
    status: 500,
    body: {
      ok: false,
      code: 'KNOWLEDGE_OPERATION_FAILED',
      error: 'Не удалось выполнить операцию с учебным материалом.',
    },
  }
}
