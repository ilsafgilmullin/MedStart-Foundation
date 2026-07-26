import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  timestampToMillis,
  type LearningMaterial,
  type MaterialKind,
} from './domain'
import type { EffectiveUserRole } from './user-profile'

export interface CreateMaterialInput {
  bookingId: string
  tutorUid: string
  tutorName: string
  studentUid: string
  studentName: string
  title: string
  description: string
  url: string
  kind: MaterialKind
}

export async function createMaterial(
  input: CreateMaterialInput,
): Promise<string> {
  const title = input.title.trim()
  if (!title) throw new Error('Укажите название материала.')
  if (input.kind !== 'note' && !input.url.trim()) {
    throw new Error('Добавьте ссылку на материал.')
  }
  if (input.url.trim()) {
    try {
      const url = new URL(input.url.trim())
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      throw new Error(
        'Укажите корректную ссылку, начинающуюся с http:// или https://.',
      )
    }
  }

  const materialRef = await addDoc(collection(db, 'materials'), {
    ...input,
    title,
    description: input.description.trim(),
    url: input.url.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return materialRef.id
}

export function subscribeToMaterialsForUser(
  uid: string,
  role: EffectiveUserRole,
  onChange: (materials: LearningMaterial[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source =
    role === 'tutor'
      ? query(collection(db, 'materials'), where('tutorUid', '==', uid))
      : role === 'student'
        ? query(collection(db, 'materials'), where('studentUid', '==', uid))
        : collection(db, 'materials')

  return onSnapshot(
    source,
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as LearningMaterial)
          .sort(
            (left, right) =>
              timestampToMillis(right.createdAt) -
              timestampToMillis(left.createdAt),
          ),
      ),
    onError,
  )
}

export function deleteMaterial(materialId: string) {
  return deleteDoc(doc(db, 'materials', materialId))
}
