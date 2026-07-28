import 'server-only'

import type { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from './firebase-admin'

export type MessageActorRole = 'student' | 'tutor' | 'admin' | 'owner'

export interface MessageActor {
  uid: string
  name: string
  email: string
  role: MessageActorRole
  moderator: boolean
}

export class MessageAccessError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'MessageAccessError'
  }
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

export async function requireMessageActor(request: Request): Promise<MessageActor> {
  const token = bearerToken(request)
  if (!token) {
    throw new MessageAccessError(401, 'AUTH_REQUIRED', 'Требуется авторизация.')
  }

  let decoded
  try {
    decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
  } catch {
    throw new MessageAccessError(401, 'SESSION_EXPIRED', 'Сессия устарела. Войдите повторно.')
  }

  if (!decoded.email_verified) {
    throw new MessageAccessError(403, 'EMAIL_NOT_VERIFIED', 'Подтвердите электронную почту.')
  }

  const profileSnapshot = await getFirebaseAdminDb().collection('users').doc(decoded.uid).get()
  if (!profileSnapshot.exists) {
    throw new MessageAccessError(403, 'PROFILE_MISSING', 'Профиль пользователя не найден.')
  }
  const profile = profileSnapshot.data() as {
    role?: string
    status?: string
    displayName?: string
    email?: string
  }
  if (profile.status !== 'active') {
    throw new MessageAccessError(403, 'ACCOUNT_UNAVAILABLE', 'Аккаунт недоступен.')
  }

  const role: MessageActorRole | null =
    decoded.uid === PRIMARY_OWNER_UID
      ? 'owner'
      : profile.role === 'student' || profile.role === 'tutor' || profile.role === 'admin'
        ? profile.role
        : null
  if (!role) {
    throw new MessageAccessError(403, 'ROLE_UNAVAILABLE', 'Для этой роли сообщения недоступны.')
  }

  return {
    uid: decoded.uid,
    name: String(profile.displayName || decoded.name || decoded.email || 'Пользователь MedStart').slice(0, 160),
    email: String(decoded.email || profile.email || ''),
    role,
    moderator: role === 'owner' || role === 'admin',
  }
}

export async function requireConversationAccess(
  conversationId: string,
  actor: MessageActor,
): Promise<DocumentSnapshot<DocumentData>> {
  if (!conversationId || conversationId.length > 400 || conversationId.includes('/')) {
    throw new MessageAccessError(400, 'INVALID_CONVERSATION', 'Некорректный идентификатор диалога.')
  }
  const snapshot = await getFirebaseAdminDb().collection('conversations').doc(conversationId).get()
  if (!snapshot.exists) {
    throw new MessageAccessError(404, 'CONVERSATION_NOT_FOUND', 'Диалог не найден.')
  }
  const data = snapshot.data() as { participantUids?: unknown }
  const participants = Array.isArray(data.participantUids) ? data.participantUids : []
  if (!actor.moderator && !participants.includes(actor.uid)) {
    throw new MessageAccessError(403, 'CONVERSATION_FORBIDDEN', 'Этот диалог недоступен.')
  }
  return snapshot
}

export function messageErrorResponse(error: unknown) {
  if (error instanceof MessageAccessError) {
    return {
      status: error.status,
      body: { ok: false, code: error.code, error: error.message },
    }
  }
  console.error('MedStart message operation failed', error)
  return {
    status: 500,
    body: {
      ok: false,
      code: 'MESSAGE_OPERATION_FAILED',
      error: 'Не удалось выполнить операцию с сообщением.',
    },
  }
}
