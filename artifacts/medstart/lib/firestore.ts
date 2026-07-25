import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase'
import type { UserProfile, UserRole, UserStatus } from './user-profile'

export interface CreateUserProfileParams {
  uid: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  status: UserStatus
  avatar?: string
  fieldOfStudy?: string
  studyYear?: string
  title?: string
  specialization?: string
  institution?: string
  experience?: string
  licenceNumber?: string
  bio?: string
  lessonPrice?: number
  isPublic?: boolean
  onboardingCompleted?: boolean
}

const clean = (value: string | undefined) => value?.trim() || ''

export async function createUserProfile(input: CreateUserProfileParams): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: input.uid,
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    displayName: `${clean(input.firstName)} ${clean(input.lastName)}`.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: input.status,
    avatar: clean(input.avatar),
    fieldOfStudy: clean(input.fieldOfStudy),
    studyYear: clean(input.studyYear),
    title: clean(input.title),
    specialization: clean(input.specialization),
    institution: clean(input.institution),
    experience: clean(input.experience),
    licenceNumber: clean(input.licenceNumber),
    bio: clean(input.bio),
    lessonPrice: input.lessonPrice ?? 0,
    rating: 0,
    reviewsCount: 0,
    isPublic: input.isPublic ?? false,
    onboardingCompleted: input.onboardingCompleted ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', input.uid), profile)
  return profile
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null
}

export async function updateUserProfile(uid: string, patch: Partial<UserProfile>) {
  const { uid: _uid, createdAt: _createdAt, ...safePatch } = patch
  await updateDoc(doc(db, 'users', uid), { ...safePatch, updatedAt: serverTimestamp() })
}

export async function deleteUserProfile(uid: string) {
  await deleteDoc(doc(db, 'users', uid))
}

export async function getPublicTutors(): Promise<UserProfile[]> {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'tutor')))
  return snapshot.docs
    .map((item) => item.data() as UserProfile)
    .filter((item) => item.status === 'active' && item.isPublic)
}
