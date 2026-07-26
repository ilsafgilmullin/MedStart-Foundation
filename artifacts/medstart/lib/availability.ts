import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { DEFAULT_AVAILABILITY, type TutorAvailability } from './domain'

export function emptyAvailability(
  tutorUid: string,
  timezone = 'Europe/Moscow',
): TutorAvailability {
  return {
    tutorUid,
    timezone,
    days: structuredClone(DEFAULT_AVAILABILITY),
  }
}

export function subscribeToAvailability(
  tutorUid: string,
  onChange: (availability: TutorAvailability) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'availability', tutorUid),
    (snapshot) =>
      onChange(
        snapshot.exists()
          ? (snapshot.data() as TutorAvailability)
          : emptyAvailability(tutorUid),
      ),
    onError,
  )
}

export async function saveAvailability(
  availability: TutorAvailability,
): Promise<void> {
  await setDoc(doc(db, 'availability', availability.tutorUid), {
    ...availability,
    updatedAt: serverTimestamp(),
  })
}
