import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  where,
} from 'firebase/firestore'

import { db } from './firebase'

export interface TutorCardData {
  uid: string
  displayName: string
  avatar: string
  title?: string
  specialization?: string
  experience?: string
  bio?: string
  lessonPrice: number
  rating: number
  reviewCount: number
  studentsCount: number
}

interface PublicTutorDocument extends TutorCardData {
  status: 'active' | 'blocked'
  isPublic: boolean
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toTutor(uid: string, data: Record<string, unknown>): TutorCardData {
  return {
    uid,
    displayName: text(data.displayName, 'Репетитор'),
    avatar: text(data.avatar),
    title: text(data.title) || undefined,
    specialization: text(data.specialization) || undefined,
    experience: text(data.experience) || undefined,
    bio: text(data.bio) || undefined,
    lessonPrice: number(data.lessonPrice),
    rating: number(data.rating),
    reviewCount: number(data.reviewCount),
    studentsCount: number(data.studentsCount),
  }
}

function isPublished(data: Record<string, unknown>) {
  return data.status === 'active' && data.isPublic === true
}

export async function getPublicTutors(maxResults = 6): Promise<TutorCardData[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'tutors'),
      where('status', '==', 'active'),
      where('isPublic', '==', true),
      firestoreLimit(Math.max(1, Math.min(maxResults, 50))),
    ),
  )

  return snapshot.docs
    .map((item) => toTutor(item.id, item.data()))
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
}

export async function getPublicTutorById(uid: string): Promise<TutorCardData | null> {
  const snapshot = await getDoc(doc(db, 'tutors', uid))
  if (!snapshot.exists()) return null

  const data = snapshot.data() as PublicTutorDocument
  if (!isPublished(data as unknown as Record<string, unknown>)) return null

  return toTutor(snapshot.id, data as unknown as Record<string, unknown>)
}
