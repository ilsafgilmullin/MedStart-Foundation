import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { WhiteboardElement } from './domain'

function elementsCollection(bookingId: string) {
  return collection(db, 'whiteboards', bookingId, 'elements')
}

export function subscribeToWhiteboard(
  bookingId: string,
  onChange: (elements: WhiteboardElement[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    elementsCollection(bookingId),
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
