import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { WhiteboardElement } from './domain'

const MAX_REALTIME_ELEMENTS = 1_200

function elementsCollection(bookingId: string) {
  return collection(db, 'whiteboards', bookingId, 'elements')
}

export function subscribeToWhiteboard(
  bookingId: string,
  onChange: (elements: WhiteboardElement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const source = query(
    elementsCollection(bookingId),
    orderBy('createdAtMs', 'desc'),
    limit(MAX_REALTIME_ELEMENTS),
  )

  return onSnapshot(
    source,
    { includeMetadataChanges: true },
    (snapshot) => {
      const elements = snapshot.docs
        .map(
          (item) =>
            ({
              id: item.id,
              ...item.data(),
            }) as WhiteboardElement,
        )
        .sort(
          (left, right) =>
            left.createdAtMs - right.createdAtMs ||
            left.id.localeCompare(right.id),
        )

      onChange(elements)
    },
    onError,
  )
}

export async function saveWhiteboardElement(
  bookingId: string,
  element: WhiteboardElement,
): Promise<void> {
  await setDoc(doc(elementsCollection(bookingId), element.id), {
    ...element,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWhiteboardElement(
  bookingId: string,
  elementId: string,
): Promise<void> {
  await deleteDoc(doc(elementsCollection(bookingId), elementId))
}

export async function clearWhiteboard(bookingId: string): Promise<void> {
  const snapshot = await getDocs(elementsCollection(bookingId))

  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = writeBatch(db)
    for (const item of snapshot.docs.slice(offset, offset + 400)) {
      batch.delete(item.ref)
    }
    await batch.commit()
  }
}
