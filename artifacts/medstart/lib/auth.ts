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

const VERIFY_EMAIL_MESSAGE =
  'Подтвердите электронную почту по ссылке из письма MedStart. Новое письмо отправлено повторно.'

function clearSensitiveBrowserState() {
  if (typeof window === 'undefined') return

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith('medstart-')) window.localStorage.removeItem(key)
    }
  } catch {
    // Some private browsing modes disable localStorage access.
  }

  try {
    window.sessionStorage.clear()
  } catch {
    // Session storage is best-effort cleanup only.
  }
}

async function secureSignOut() {
  try {
    await signOut(auth)
  } finally {
    clearSensitiveBrowserState()
  }
}

async function assertAccess(profile: UserProfile) {
  if (profile.status === 'blocked' || profile.status === 'deleted') {
    await secureSignOut()
    throw new Error(
      profile.status === 'blocked'
        ? 'Аккаунт заблокирован.'
        : 'Аккаунт удалён.',
    )
  }
}

async function assertVerifiedEmail(credential: UserCredential) {
  await credential.user.reload()
  if (credential.user.emailVerified) return

  await sendEmailVerification(credential.user).catch(() => undefined)
  await secureSignOut()
  throw new Error(VERIFY_EMAIL_MESSAGE)
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
  await assertVerifiedEmail(credential)

  const profile = await getUserProfile(credential.user.uid)
  if (!profile) {
    await secureSignOut()
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
  let profile: UserProfile
  try {
    profile = await createProfile(credential.user.uid)
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined)
    clearSensitiveBrowserState()
    throw error
  }

  await sendEmailVerification(credential.user).catch(() => undefined)
  await secureSignOut()
  return { credential, profile }
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

export async function logout(): Promise<void> {
  await secureSignOut()
  if (typeof window !== 'undefined') {
    // A full navigation destroys the in-memory Firestore cache so a subsequent
    // account on the same device cannot receive stale private snapshots.
    window.location.replace('/login?loggedOut=1')
  }
}

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim().toLowerCase())
export async function resendEmailVerification(): Promise<void> {
  if (!auth.currentUser) throw new Error('Сначала войдите в аккаунт.')
  await sendEmailVerification(auth.currentUser)
}
export { isOwnerUid } from './access-control'
