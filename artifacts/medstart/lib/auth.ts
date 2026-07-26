import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './firebase'
import { createUserProfile, getUserProfile } from './firestore'
import type { UserProfile } from './user-profile'

export interface StudentRegistrationInput {
  firstName: string
  lastName: string
  email: string
  password: string
  fieldOfStudy: string
  studyYear: string
}

export interface TutorRegistrationInput {
  firstName: string
  lastName: string
  email: string
  password: string
  specialization: string
  subjects?: string[]
  institution?: string
  experience?: string
  bio?: string
  city?: string
  lessonPrice?: number
  lessonDuration?: number
  lessonFormats?: Array<'online' | 'in_person'>
}

export interface AuthSession {
  credential: UserCredential
  profile: UserProfile
}

async function assertAccess(profile: UserProfile) {
  if (profile.status === 'blocked' || profile.status === 'deleted') {
    await signOut(auth)
    throw new Error(
      profile.status === 'blocked'
        ? 'Аккаунт заблокирован.'
        : 'Аккаунт удалён.',
    )
  }
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  )
  const profile = await getUserProfile(credential.user.uid)
  if (!profile) {
    await signOut(auth)
    throw new Error('Профиль пользователя не найден. Обратитесь в поддержку.')
  }
  await assertAccess(profile)
  return { credential, profile }
}

async function registerWithProfile(
  email: string,
  password: string,
  createProfile: (uid: string) => Promise<UserProfile>,
): Promise<AuthSession> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  )
  try {
    const profile = await createProfile(credential.user.uid)
    await sendEmailVerification(credential.user).catch(() => undefined)
    return { credential, profile }
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined)
    throw error
  }
}

export function registerStudent(input: StudentRegistrationInput) {
  return registerWithProfile(input.email, input.password, (uid) =>
    createUserProfile({
      uid,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: 'student',
      status: 'active',
      fieldOfStudy: input.fieldOfStudy,
      studyYear: input.studyYear,
      onboardingCompleted: true,
    }),
  )
}

export function registerTutor(input: TutorRegistrationInput) {
  return registerWithProfile(input.email, input.password, (uid) =>
    createUserProfile({
      uid,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: 'tutor',
      status: 'pending',
      specialization: input.specialization,
      subjects: input.subjects,
      institution: input.institution,
      experience: input.experience,
      bio: input.bio,
      city: input.city,
      lessonPrice: input.lessonPrice,
      lessonDuration: input.lessonDuration,
      lessonFormats: input.lessonFormats,
      onboardingCompleted: true,
      isPublic: false,
    }),
  )
}

export const logout = () => signOut(auth)
export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim().toLowerCase())
export async function resendEmailVerification(): Promise<void> {
  if (!auth.currentUser) throw new Error('Сначала войдите в аккаунт.')
  await sendEmailVerification(auth.currentUser)
}
export { isOwnerUid } from './access-control'
