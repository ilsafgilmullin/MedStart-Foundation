import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from './firebase'
import type { UserProfile } from './user-profile'

export async function getPendingTutors(): Promise<UserProfile[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'users'),
      where('role', '==', 'tutor'),
      where('status', '==', 'pending'),
    ),
  )

  return snapshot.docs.map((item) => item.data() as UserProfile)
}

export async function approveTutor(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status: 'active',
    isPublic: true,
    updatedAt: serverTimestamp(),
  })
}

export async function rejectTutor(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    status: 'blocked',
    isPublic: false,
    updatedAt: serverTimestamp(),
  })
}
