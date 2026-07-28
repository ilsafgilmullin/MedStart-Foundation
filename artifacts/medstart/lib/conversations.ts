import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { messagePreview } from './medical-chat'
import {
  timestampToMillis,
  type ChatMessage,
  type ChatMessageKind,
  type ChatReaction,
  type Conversation,
  type MedicalMessageTag,
  type MedicalReactionCode,
} from './domain'

const MAX_VISIBLE_CONVERSATIONS = 100
const MAX_REALTIME_MESSAGES = 250
const MAX_REALTIME_REACTIONS = 1_000

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

function cleanText(value: string | undefined, max = 2_000) {
  return (value || '').trim().slice(0, max)
}

function sortConversations(items: Conversation[]) {
  return [...items]
    .sort(
      (left, right) =>
        timestampToMillis(right.updatedAt) - timestampToMillis(left.updatedAt),
    )
    .slice(0, MAX_VISIBLE_CONVERSATIONS)
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
          .map((item) => ({ id: item.id, ...item.data() }) as ChatMessage)
          .reverse(),
      ),
    onError,
  )
}

export function subscribeToMessageReactions(
  conversationId: string,
  onChange: (reactions: ChatReaction[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source = query(
    collection(db, 'messageReactions'),
    where('conversationId', '==', conversationId),
    limit(MAX_REALTIME_REACTIONS),
  )
  return onSnapshot(
    source,
    (snapshot) =>
      onChange(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as ChatReaction,
        ),
      ),
    onError,
  )
}

export async function sendMessage(
  conversationId: string,
  sender: ChatSender,
  input: SendChatMessageInput,
): Promise<void> {
  const kind = input.kind || 'text'
  const text = cleanText(input.text)
  const medicalTag = input.medicalTag || ''
  const mediaPath = cleanText(input.mediaPath, 1_000)
  const mimeType = cleanText(input.mimeType, 160)
  const fileName = cleanText(input.fileName, 240)
  const fileSize = Math.max(0, Math.round(input.fileSize || 0))
  const durationMs = Math.max(0, Math.round(input.durationMs || 0))

  if ((kind === 'text' || kind === 'medical_note') && !text) return
  if (text.length > 2_000) {
    throw new Error('Сообщение не может быть длиннее 2000 символов.')
  }
  if (kind === 'voice' && (!mediaPath || !mimeType.startsWith('audio/'))) {
    throw new Error('Голосовая запись не была загружена.')
  }
  if (
    kind === 'video_note' &&
    (!mediaPath || !mimeType.startsWith('video/'))
  ) {
    throw new Error('Видеокружок не был загружен.')
  }
  if (kind === 'file' && (!mediaPath || !mimeType || !fileName)) {
    throw new Error('Вложение не было загружено.')
  }

  const conversationRef = doc(db, 'conversations', conversationId)
  const messageRef = doc(collection(conversationRef, 'messages'))
  const batch = writeBatch(db)
  const preview = messagePreview(kind, text, fileName)

  batch.set(messageRef, {
    senderUid: sender.uid,
    senderName: cleanText(sender.name, 160) || 'Пользователь MedStart',
    senderRole: sender.role,
    kind,
    text,
    medicalTag,
    mediaPath,
    mimeType,
    fileName,
    fileSize,
    durationMs,
    createdAt: serverTimestamp(),
  })
  batch.update(conversationRef, {
    lastMessage: preview,
    lastSenderUid: sender.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

function reactionDocumentId(
  conversationId: string,
  messageId: string,
  uid: string,
) {
  return `${conversationId}__${messageId}__${uid}`
}

export async function toggleMessageReaction(input: {
  conversationId: string
  messageId: string
  uid: string
  code: MedicalReactionCode
}) {
  const reference = doc(
    db,
    'messageReactions',
    reactionDocumentId(input.conversationId, input.messageId, input.uid),
  )
  const current = await getDoc(reference)
  if (current.exists() && current.data().code === input.code) {
    await deleteDoc(reference)
    return
  }
  await setDoc(reference, {
    conversationId: input.conversationId,
    messageId: input.messageId,
    uid: input.uid,
    code: input.code,
    createdAt: serverTimestamp(),
  })
}
