import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './firebase'
import { createUserProfile, getUserProfile } from './firestore'
import type { UserProfile } from './user-profile'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

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
  institution?: string
  experience?: string
  bio?: string
}

export interface AuthSession { credential: UserCredential; profile: UserProfile }

function nameFromUser(user: User) {
  const parts = user.displayName?.trim().split(/\s+/) ?? []
  return {
    firstName: parts[0] || user.email?.split('@')[0] || 'Пользователь',
    lastName: parts.slice(1).join(' '),
  }
}

async function assertAccess(profile: UserProfile) {
  if (profile.status === 'blocked' || profile.status === 'deleted') {
    await signOut(auth)
    throw new Error(profile.status === 'blocked' ? 'Аккаунт заблокирован.' : 'Аккаунт удалён.')
  }
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
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
  const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
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
      institution: input.institution,
      experience: input.experience,
      bio: input.bio,
      onboardingCompleted: true,
      isPublic: false,
    }),
  )
}

export async function loginWithGoogle(): Promise<AuthSession> {
  const credential = await signInWithPopup(auth, googleProvider)
  let profile = await getUserProfile(credential.user.uid)
  if (!profile) {
    const { firstName, lastName } = nameFromUser(credential.user)
    profile = await createUserProfile({
      uid: credential.user.uid,
      firstName,
      lastName,
      email: credential.user.email ?? '',
      avatar: credential.user.photoURL ?? '',
      role: 'student',
      status: 'active',
      onboardingCompleted: true,
    })
  }
  await assertAccess(profile)
  return { credential, profile }
}

export const logout = () => signOut(auth)
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim().toLowerCase())
export const isOwnerUid = (uid: string) => Boolean(process.env.NEXT_PUBLIC_OWNER_UID) && uid === process.env.NEXT_PUBLIC_OWNER_UID
