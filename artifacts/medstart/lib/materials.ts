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

const MATERIAL_KINDS = new Set<MaterialKind>([
  'link',
  'document',
  'video',
  'note',
])

function safeHttpsUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

export async function createMaterial(
  input: CreateMaterialInput,
): Promise<string> {
  const title = input.title.trim().slice(0, 180)
  const description = input.description.trim().slice(0, 4_000)
  const url = input.url.trim().slice(0, 2_000)

  if (!MATERIAL_KINDS.has(input.kind)) {
    throw new Error('Выбран неподдерживаемый тип материала.')
  }
  if (!title) throw new Error('Укажите название материала.')
  if (input.kind === 'note' && url) {
    throw new Error('Для заметки ссылка не требуется.')
  }
  if (input.kind !== 'note' && !safeHttpsUrl(url)) {
    throw new Error('Укажите безопасную ссылку, начинающуюся с https://.')
  }

  const materialRef = await addDoc(collection(db, 'materials'), {
    ...input,
    title,
    description,
    url: input.kind === 'note' ? '' : url,
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
