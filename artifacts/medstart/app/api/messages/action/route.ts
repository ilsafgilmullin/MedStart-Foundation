import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { writeAdminAudit } from '@/lib/server/admin-control'
import { getFirebaseAdminBucket, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  messageErrorResponse,
  requireConversationAccess,
  requireMessageActor,
} from '@/lib/server/message-access'
import { messagePreview } from '@/lib/medical-chat'
import type {
  ChatMessageKind,
  MedicalMessageTag,
  MedicalReactionCode,
} from '@/lib/domain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const validKinds = new Set<ChatMessageKind>([
  'text',
  'voice',
  'video_note',
  'file',
  'medical_note',
])
const validTags = new Set<MedicalMessageTag>([
  '',
  'clinical_case',
  'homework',
  'ecg',
  'lab',
  'important',
  'medication',
])
const validReactions = new Set<MedicalReactionCode>([
  'heart',
  'brain',
  'stethoscope',
  'dna',
  'pill',
  'check',
])
const safeFiles = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

interface ActionBody {
  action?: unknown
  conversationId?: unknown
  requestId?: unknown
  messageId?: unknown
  code?: unknown
  message?: {
    kind?: unknown
    text?: unknown
    medicalTag?: unknown
    mediaPath?: unknown
    mimeType?: unknown
    fileName?: unknown
    fileSize?: unknown
    durationMs?: unknown
  }
}

const requestWindows = new Map<string, { startedAt: number; count: number }>()

function rateLimit(uid: string, action: string) {
  const key = `${uid}:${action}`
  const now = Date.now()
  const current = requestWindows.get(key)
  if (!current || now - current.startedAt > 60_000) {
    requestWindows.set(key, { startedAt: now, count: 1 })
    return
  }
  const limit = action === 'reaction' ? 120 : 40
  current.count += 1
  if (current.count > limit) {
    throw new Error('Слишком много действий. Подождите минуту и повторите.')
  }
}

function text(value: unknown, max = 2_000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function baseMime(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase()
}

function integer(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0
}

async function verifiedMedia(input: {
  conversationId: string
  actorUid: string
  kind: ChatMessageKind
  path: string
  claimedType: string
  claimedSize: number
}) {
  if (!input.path.startsWith(`chat-media/${input.conversationId}/${input.actorUid}/`)) {
    throw new Error('Медиафайл не принадлежит текущему отправителю или диалогу.')
  }
  const file = getFirebaseAdminBucket().file(input.path)
  const [exists] = await file.exists()
  if (!exists) throw new Error('Загруженный медиафайл не найден.')
  const [metadata] = await file.getMetadata()
  const actualType = String(metadata.contentType || '')
  const actualBaseType = baseMime(actualType)
  const claimedBaseType = baseMime(input.claimedType)
  const actualSize = Number(metadata.size || 0)
  const custom = metadata.metadata || {}
  if (
    custom.conversationId !== input.conversationId ||
    custom.uploaderUid !== input.actorUid
  ) {
    throw new Error('Метаданные медиафайла не прошли проверку.')
  }
  if (!actualSize || actualSize !== input.claimedSize || actualSize > 25 * 1024 * 1024) {
    throw new Error('Размер медиафайла не прошёл проверку.')
  }
  if (!actualBaseType || actualBaseType !== claimedBaseType) {
    throw new Error('Тип медиафайла не прошёл проверку.')
  }
  if (input.kind === 'voice' && !actualBaseType.startsWith('audio/')) {
    throw new Error('Голосовое сообщение должно быть аудиофайлом.')
  }
  if (input.kind === 'video_note' && !actualBaseType.startsWith('video/')) {
    throw new Error('Видеокружок должен быть видеофайлом.')
  }
  if (input.kind === 'file' && !safeFiles.has(actualBaseType)) {
    throw new Error('Этот тип вложения запрещён.')
  }
}

async function send(request: Request, body: ActionBody) {
  const actor = await requireMessageActor(request)
  rateLimit(actor.uid, 'send')
  const conversationId = text(body.conversationId, 400)
  const requestId = text(body.requestId, 80)
  if (requestId && !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)) {
    throw new Error('Некорректный идентификатор отправки.')
  }
  await requireConversationAccess(conversationId, actor)

  const raw = body.message || {}
  const kind = validKinds.has(raw.kind as ChatMessageKind)
    ? (raw.kind as ChatMessageKind)
    : 'text'
  const messageText = text(raw.text)
  const medicalTag = validTags.has(raw.medicalTag as MedicalMessageTag)
    ? (raw.medicalTag as MedicalMessageTag)
    : ''
  const mediaPath = text(raw.mediaPath, 1_000)
  const mimeType = text(raw.mimeType, 160)
  const fileName = text(raw.fileName, 240)
  const fileSize = integer(raw.fileSize)
  const durationMs = integer(raw.durationMs)

  if ((kind === 'text' || kind === 'medical_note') && !messageText) {
    throw new Error('Введите текст сообщения.')
  }
  if (kind === 'medical_note' && !medicalTag) {
    throw new Error('Выберите тип медицинской заметки.')
  }
  if (kind === 'voice' && (durationMs < 500 || durationMs > 120_000)) {
    throw new Error('Голосовое сообщение должно длиться не более 2 минут.')
  }
  if (kind === 'video_note' && (durationMs < 500 || durationMs > 60_000)) {
    throw new Error('Видеокружок должен длиться не более 60 секунд.')
  }
  if (kind === 'file' && (!fileName || fileSize > 15 * 1024 * 1024)) {
    throw new Error('Вложение превышает допустимый размер или не имеет имени.')
  }

  if (kind === 'voice' || kind === 'video_note' || kind === 'file') {
    await verifiedMedia({
      conversationId,
      actorUid: actor.uid,
      kind,
      path: mediaPath,
      claimedType: mimeType,
      claimedSize: fileSize,
    })
  } else if (mediaPath || mimeType || fileName || fileSize || durationMs) {
    throw new Error('Текстовое сообщение не должно содержать медиаполя.')
  }

  const db = getFirebaseAdminDb()
  const conversationRef = db.collection('conversations').doc(conversationId)
  const messageRef = requestId
    ? conversationRef.collection('messages').doc(requestId)
    : conversationRef.collection('messages').doc()
  if (requestId) {
    const existing = await messageRef.get()
    if (existing.exists) return { messageId: messageRef.id }
  }
  const preview = messagePreview(kind, messageText, fileName)
  const batch = db.batch()
  batch.set(messageRef, {
    senderUid: actor.uid,
    senderName: actor.name,
    senderRole: actor.role,
    kind,
    text: messageText,
    medicalTag,
    mediaPath,
    mimeType,
    fileName,
    fileSize,
    durationMs,
    reactions: {},
    createdAt: FieldValue.serverTimestamp(),
  })
  batch.update(conversationRef, {
    lastMessage: preview,
    lastSenderUid: actor.uid,
    lastMessageAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await batch.commit()

  if (actor.moderator) {
    await writeAdminAudit({
      actor: {
        uid: actor.uid,
        displayName: actor.name,
        email: actor.email,
        role: actor.role === 'owner' ? 'owner' : 'admin',
      },
      action: 'support_message_sent',
      summary: `Отправлено служебное сообщение MedStart в диалог ${conversationId}.`,
      targetType: 'conversation',
      metadata: { conversationId, messageId: messageRef.id, kind },
    })
  }

  return { messageId: messageRef.id }
}

async function reaction(request: Request, body: ActionBody) {
  const actor = await requireMessageActor(request)
  rateLimit(actor.uid, 'reaction')
  const conversationId = text(body.conversationId, 400)
  const messageId = text(body.messageId, 400)
  const code = validReactions.has(body.code as MedicalReactionCode)
    ? (body.code as MedicalReactionCode)
    : null
  if (!messageId || !code) throw new Error('Некорректная реакция.')
  await requireConversationAccess(conversationId, actor)

  const reference = getFirebaseAdminDb()
    .collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .doc(messageId)
  await getFirebaseAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists) throw new Error('Сообщение не найдено.')
    const current = snapshot.data()?.reactions
    const reactions =
      current && typeof current === 'object'
        ? { ...(current as Record<string, MedicalReactionCode>) }
        : {}
    if (reactions[actor.uid] === code) delete reactions[actor.uid]
    else reactions[actor.uid] = code
    transaction.update(reference, { reactions })
  })
  return { reacted: true }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ActionBody
    const action = text(body.action, 40)
    const result = action === 'reaction'
      ? await reaction(request, body)
      : action === 'send'
        ? await send(request, body)
        : (() => { throw new Error('Неизвестное действие с сообщением.') })()
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const response = messageErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
