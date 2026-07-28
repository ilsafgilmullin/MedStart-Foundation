import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import {
  timestampToMillis,
  type ChatMessage,
  type ChatMessageKind,
  type Conversation,
  type MedicalMessageTag,
  type MedicalReactionCode,
} from './domain'

const MAX_VISIBLE_CONVERSATIONS = 100
const MAX_REALTIME_MESSAGES = 250

export interface ConversationSubscriptionOptions {
  moderator?: boolean
}

export interface ChatSender {
  uid: string
  name: string
  role: 'student' | 'tutor' | 'admin' | 'owner'
}

export interface SendChatMessageInput {
  kind?: ChatMessageKind
  text?: string
  medicalTag?: MedicalMessageTag
  mediaPath?: string
  mimeType?: string
  fileName?: string
  fileSize?: number
  durationMs?: number
}

interface MessageApiResponse {
  ok?: boolean
  error?: string
}

class MessageNetworkError extends Error {}

function friendlyMessageNetworkError() {
  return new Error('Связь с сервером MedStart прервалась. Проверьте интернет и повторите действие.')
}

function newRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function sortConversations(items: Conversation[]) {
  return [...items]
    .sort(
      (left, right) =>
        timestampToMillis(right.updatedAt) - timestampToMillis(left.updatedAt),
    )
    .slice(0, MAX_VISIBLE_CONVERSATIONS)
}

function normalizedMessage(id: string, data: DocumentData): ChatMessage {
  const kind: ChatMessageKind = [
    'text',
    'voice',
    'video_note',
    'file',
    'medical_note',
  ].includes(String(data.kind))
    ? (data.kind as ChatMessageKind)
    : 'text'
  const senderRole = ['student', 'tutor', 'admin', 'owner'].includes(
    String(data.senderRole),
  )
    ? (data.senderRole as ChatMessage['senderRole'])
    : 'student'

  return {
    id,
    senderUid: String(data.senderUid || ''),
    senderName: String(data.senderName || 'Участник диалога').slice(0, 160),
    senderRole,
    kind,
    text: String(data.text || '').slice(0, 2_000),
    medicalTag: String(data.medicalTag || '') as MedicalMessageTag,
    mediaPath: String(data.mediaPath || '').slice(0, 1_000),
    mimeType: String(data.mimeType || '').slice(0, 160),
    fileName: String(data.fileName || '').slice(0, 240),
    fileSize:
      typeof data.fileSize === 'number' && Number.isFinite(data.fileSize)
        ? Math.max(0, data.fileSize)
        : 0,
    durationMs:
      typeof data.durationMs === 'number' && Number.isFinite(data.durationMs)
        ? Math.max(0, data.durationMs)
        : 0,
    reactions:
      data.reactions && typeof data.reactions === 'object'
        ? (data.reactions as Record<string, MedicalReactionCode>)
        : {},
    createdAt: data.createdAt,
  }
}

async function performMessageAction(body: Record<string, unknown>, forceRefresh = false) {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('Сессия авторизации устарела. Войдите повторно.')
  }
  const token = await currentUser.getIdToken(forceRefresh)
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 25_000)
  let response: Response
  try {
    response = await fetch('/api/messages/action', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch {
    throw new MessageNetworkError('NETWORK')
  } finally {
    window.clearTimeout(timer)
  }
  const payload = (await response.json().catch(() => ({}))) as MessageApiResponse
  if (!response.ok) {
    throw new Error(payload.error || 'Сервер не принял операцию с сообщением.')
  }
}

async function postMessageAction(body: Record<string, unknown>, retryNetwork = false) {
  try {
    await performMessageAction(body)
  } catch (error) {
    if (retryNetwork && error instanceof MessageNetworkError) {
      try {
        await performMessageAction(body, true)
        return
      } catch (retryError) {
        if (!(retryError instanceof MessageNetworkError)) throw retryError
      }
    } else if (!(error instanceof MessageNetworkError)) {
      throw error
    }
    throw friendlyMessageNetworkError()
  }
}

export function subscribeToConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void,
  options: ConversationSubscriptionOptions = {},
): Unsubscribe {
  const source = options.moderator
    ? query(
        collection(db, 'conversations'),
        orderBy('updatedAt', 'desc'),
        limit(MAX_VISIBLE_CONVERSATIONS),
      )
    : query(
        collection(db, 'conversations'),
        where('participantUids', 'array-contains', uid),
      )

  return onSnapshot(
    source,
    (snapshot) =>
      onChange(
        sortConversations(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as Conversation,
          ),
        ),
      ),
    onError,
  )
}

export function subscribeToMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(MAX_REALTIME_MESSAGES),
  )

  return onSnapshot(
    source,
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((item) => normalizedMessage(item.id, item.data()))
          .reverse(),
      ),
    onError,
  )
}

export function sendMessage(
  conversationId: string,
  sender: ChatSender,
  input: SendChatMessageInput,
): Promise<void>
export function sendMessage(
  conversationId: string,
  senderUid: string,
  text: string,
): Promise<void>
export async function sendMessage(
  conversationId: string,
  senderOrUid: ChatSender | string,
  inputOrText: SendChatMessageInput | string,
): Promise<void> {
  const senderUid =
    typeof senderOrUid === 'string' ? senderOrUid : senderOrUid.uid
  if (auth.currentUser?.uid !== senderUid) {
    throw new Error('Сессия отправителя не совпадает с текущим аккаунтом.')
  }
  const message: SendChatMessageInput =
    typeof inputOrText === 'string' ? { text: inputOrText } : inputOrText
  await postMessageAction({
    action: 'send',
    requestId: newRequestId(),
    conversationId,
    message,
  }, true)
}

export async function toggleMessageReaction(input: {
  conversationId: string
  messageId: string
  uid: string
  code: MedicalReactionCode
}) {
  if (auth.currentUser?.uid !== input.uid) {
    throw new Error('Сессия реакции не совпадает с текущим аккаунтом.')
  }
  await postMessageAction({
    action: 'reaction',
    conversationId: input.conversationId,
    messageId: input.messageId,
    code: input.code,
  })
}
