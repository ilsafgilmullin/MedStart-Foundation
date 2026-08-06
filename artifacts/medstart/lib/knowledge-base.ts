import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import {
  timestampToMillis,
  type KnowledgeDiscipline,
  type KnowledgeLevel,
  type KnowledgeResourceKind,
  type KnowledgeSourceMode,
  type KnowledgeSubmission,
} from './domain'

const KNOWLEDGE_COLLECTION = 'knowledgeSubmissions'
const API_TIMEOUT_MS = 60_000

export interface CreateKnowledgeSubmissionInput {
  id: string
  title: string
  description: string
  kind: KnowledgeResourceKind
  discipline: KnowledgeDiscipline
  level: KnowledgeLevel
  author: string
  publicationYear: string
  sourceMode: KnowledgeSourceMode
  sourceUrl: string
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  submittedByUid: string
  submittedByName: string
}

interface KnowledgeApiResponse {
  ok?: boolean
  error?: string
}

function cleanText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength)
}

function validateHttpsUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function authorizationToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) throw new Error('Сессия авторизации устарела. Войдите повторно.')
  return user.getIdToken(forceRefresh)
}

async function knowledgeRequest(
  input: RequestInfo | URL,
  init: RequestInit,
  fallback: string,
) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(input, { ...init, signal: controller.signal })
    const payload = (await response.json().catch(() => ({}))) as KnowledgeApiResponse
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || fallback)
    }
    return payload
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') throw error
    throw new Error(`${fallback} Проверьте интернет и повторите действие.`)
  } finally {
    window.clearTimeout(timer)
  }
}

function sortSubmissions(items: KnowledgeSubmission[]) {
  return [...items].sort(
    (left, right) =>
      timestampToMillis(right.publishedAt) -
        timestampToMillis(left.publishedAt) ||
      timestampToMillis(right.createdAt) - timestampToMillis(left.createdAt),
  )
}

function snapshotToSubmissions(
  snapshot: QuerySnapshot<DocumentData, DocumentData>,
) {
  return sortSubmissions(
    snapshot.docs.map(
      (item) => ({ id: item.id, ...item.data() }) as KnowledgeSubmission,
    ),
  )
}

export function createKnowledgeSubmissionId(): string {
  return doc(collection(db, KNOWLEDGE_COLLECTION)).id
}

export async function createKnowledgeSubmission(
  input: CreateKnowledgeSubmissionInput,
): Promise<void> {
  const title = cleanText(input.title, 180)
  const description = cleanText(input.description, 4_000)
  const author = cleanText(input.author, 160)
  const publicationYear = cleanText(input.publicationYear, 20)

  if (title.length < 3) {
    throw new Error('Название должно содержать не менее трёх символов.')
  }
  if (description.length < 20) {
    throw new Error('Коротко опишите содержание и учебную пользу материала.')
  }
  if (author.length < 2) {
    throw new Error('Укажите автора или организацию.')
  }
  if (
    input.sourceMode === 'link' &&
    !validateHttpsUrl(input.sourceUrl.trim())
  ) {
    throw new Error('Укажите безопасную ссылку, начинающуюся с https://.')
  }
  if (input.sourceMode === 'file' && !input.filePath.trim()) {
    throw new Error('PDF-файл не был загружен.')
  }

  const token = await authorizationToken()
  await knowledgeRequest(
    '/api/knowledge/submissions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: input.id,
        title,
        description,
        kind: input.kind,
        discipline: input.discipline,
        level: input.level,
        author,
        publicationYear,
        sourceMode: input.sourceMode,
        sourceUrl:
          input.sourceMode === 'link'
            ? input.sourceUrl.trim().slice(0, 2_000)
            : '',
        filePath:
          input.sourceMode === 'file'
            ? input.filePath.trim().slice(0, 1_000)
            : '',
        rightsConfirmed: true,
        medicalConfirmed: true,
        noPatientDataConfirmed: true,
      }),
    },
    'Не удалось отправить материал на проверку.',
  )
}

export function subscribeToPublishedKnowledge(
  onChange: (items: KnowledgeSubmission[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, KNOWLEDGE_COLLECTION),
      where('status', '==', 'published'),
    ),
    (snapshot) => onChange(snapshotToSubmissions(snapshot)),
    onError,
  )
}

export function subscribeToTutorKnowledge(
  tutorUid: string,
  onChange: (items: KnowledgeSubmission[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, KNOWLEDGE_COLLECTION),
      where('submittedByUid', '==', tutorUid),
    ),
    (snapshot) => onChange(snapshotToSubmissions(snapshot)),
    onError,
  )
}

export function subscribeToKnowledgeModeration(
  onChange: (items: KnowledgeSubmission[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, KNOWLEDGE_COLLECTION),
      where('status', '==', 'pending'),
    ),
    (snapshot) => onChange(snapshotToSubmissions(snapshot)),
    onError,
  )
}

export type KnowledgeModerationDecision = 'approve' | 'reject'

export async function moderateKnowledgeSubmission(
  submissionId: string,
  _moderatorUid: string,
  decision: KnowledgeModerationDecision,
  note = '',
): Promise<void> {
  const cleanNote = cleanText(note, 1_000)
  if (decision === 'reject' && cleanNote.length < 3) {
    throw new Error('Укажите причину отклонения.')
  }

  const token = await authorizationToken()
  await knowledgeRequest(
    '/api/knowledge/moderation',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionId,
        decision,
        note: cleanNote,
      }),
    },
    'Не удалось выполнить модерацию.',
  )
}

export async function deleteKnowledgeSubmission(submissionId: string) {
  const token = await authorizationToken()
  await knowledgeRequest(
    '/api/knowledge/submissions',
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionId }),
    },
    'Не удалось удалить материал.',
  )
}

export function subscribeToKnowledgeBookmarks(
  uid: string,
  onChange: (ids: Set<string>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', uid, 'knowledgeBookmarks'),
    (snapshot) => onChange(new Set(snapshot.docs.map((item) => item.id))),
    onError,
  )
}

export function setKnowledgeBookmark(
  uid: string,
  resourceId: string,
  enabled: boolean,
) {
  const bookmarkRef = doc(db, 'users', uid, 'knowledgeBookmarks', resourceId)
  if (!enabled) return deleteDoc(bookmarkRef)
  return setDoc(bookmarkRef, {
    resourceId,
    createdAt: serverTimestamp(),
  })
}
