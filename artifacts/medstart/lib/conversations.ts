import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  timestampToMillis,
  type ChatMessage,
  type Conversation,
} from './domain'

const MAX_VISIBLE_CONVERSATIONS = 100
const MAX_REALTIME_MESSAGES = 200

export function subscribeToConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source = query(
    collection(db, 'conversations'),
    where('participantUids', 'array-contains', uid),
  )

  return onSnapshot(
    source,
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as Conversation)
          .sort(
            (left, right) =>
              timestampToMillis(right.updatedAt) -
              timestampToMillis(left.updatedAt),
          )
          .slice(0, MAX_VISIBLE_CONVERSATIONS),
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
  senderUid: string,
  rawText: string,
): Promise<void> {
  const text = rawText.trim()
  if (!text) return
  if (text.length > 2_000) {
    throw new Error('Сообщение не может быть длиннее 2000 символов.')
  }

  const conversationRef = doc(db, 'conversations', conversationId)
  const messageRef = doc(collection(conversationRef, 'messages'))
  const batch = writeBatch(db)

  batch.set(messageRef, {
    senderUid,
    text,
    createdAt: serverTimestamp(),
  })
  batch.update(conversationRef, {
    lastMessage: text,
    lastSenderUid: senderUid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}
