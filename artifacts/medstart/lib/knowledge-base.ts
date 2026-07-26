import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  timestampToMillis,
  type KnowledgeDiscipline,
  type KnowledgeLevel,
  type KnowledgeResourceKind,
  type KnowledgeSourceMode,
  type KnowledgeSubmission,
} from './domain'

const KNOWLEDGE_COLLECTION = 'knowledgeSubmissions'

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
  const submittedByName = cleanText(input.submittedByName, 160)

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

  await setDoc(doc(db, KNOWLEDGE_COLLECTION, input.id), {
    origin: 'tutor',
    status: 'pending',
    title,
    description,
    kind: input.kind,
    discipline: input.discipline,
    level: input.level,
    author,
    publicationYear,
    sourceMode: input.sourceMode,
    sourceUrl:
      input.sourceMode === 'link' ? input.sourceUrl.trim().slice(0, 2_000) : '',
    filePath:
      input.sourceMode === 'file' ? input.filePath.trim().slice(0, 1_000) : '',
    fileName: input.sourceMode === 'file' ? cleanText(input.fileName, 240) : '',
    fileSize: input.sourceMode === 'file' ? input.fileSize : 0,
    mimeType: input.sourceMode === 'file' ? input.mimeType : '',
    submittedByUid: input.submittedByUid,
    submittedByName,
    rightsConfirmed: true,
    medicalConfirmed: true,
    noPatientDataConfirmed: true,
    moderationNote: '',
    moderatedBy: '',
    moderatedAt: null,
    publishedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
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
  moderatorUid: string,
  decision: KnowledgeModerationDecision,
  note = '',
): Promise<void> {
  const cleanNote = cleanText(note, 1_000)
  if (decision === 'reject' && cleanNote.length < 3) {
    throw new Error('Укажите причину отклонения.')
  }

  await updateDoc(doc(db, KNOWLEDGE_COLLECTION, submissionId), {
    status: decision === 'approve' ? 'published' : 'rejected',
    moderationNote: cleanNote,
    moderatedBy: moderatorUid,
    moderatedAt: serverTimestamp(),
    publishedAt: decision === 'approve' ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
}

export function deleteKnowledgeSubmission(submissionId: string) {
  return deleteDoc(doc(db, KNOWLEDGE_COLLECTION, submissionId))
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
