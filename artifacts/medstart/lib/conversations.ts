import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
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

function sortConversations(items: Conversation[]) {
  return [...items]
    .sort(
      (left, right) =>
        timestampToMillis(right.updatedAt) - timestampToMillis(left.updatedAt),
    )
    .slice(0, MAX_VISIBLE_CONVERSATIONS)
}

async function postMessageAction(body: Record<string, unknown>) {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error('Сессия авторизации устарела. Войдите повторно.')
  }
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/messages/action', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as MessageApiResponse
  if (!response.ok) {
    throw new Error(payload.error || 'Сервер не принял операцию с сообщением.')
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
          .map((item) => ({ id: item.id, ...item.data() }) as ChatMessage)
          .reverse(),
      ),
    onError,
  )
}

export async function sendMessage(
  conversationId: string,
  sender: ChatSender,
  input: SendChatMessageInput,
): Promise<void> {
  if (auth.currentUser?.uid !== sender.uid) {
    throw new Error('Сессия отправителя не совпадает с текущим аккаунтом.')
  }
  await postMessageAction({
    action: 'send',
    conversationId,
    message: input,
  })
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
