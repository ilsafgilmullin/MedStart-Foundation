import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from 'firebase/auth'
import { auth, authReady } from './firebase'
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

export class EmailVerificationRequiredError extends Error {
  readonly verificationSent: boolean

  constructor(message: string, verificationSent: boolean) {
    super(message)
    this.name = 'EmailVerificationRequiredError'
    this.verificationSent = verificationSent
  }
}

const VERIFY_EMAIL_SENT_MESSAGE =
  'Почта не подтверждена. Новое письмо отправлено. Проверьте «Входящие», «Спам» и «Рассылки», подтвердите почту и войдите снова.'
const VERIFY_EMAIL_RATE_LIMIT_MESSAGE =
  'Письмо уже отправлялось недавно. Проверьте почту и повторите вход позже.'
const VERIFY_EMAIL_FAILED_MESSAGE =
  'Не удалось отправить письмо подтверждения. Повторите попытку позже.'

let activeAuthTransitions = 0

export function isAuthTransitionInProgress() {
  return activeAuthTransitions > 0
}

async function runAuthTransition<T>(operation: () => Promise<T>): Promise<T> {
  activeAuthTransitions += 1
  try {
    await authReady
    return await operation()
  } finally {
    activeAuthTransitions = Math.max(0, activeAuthTransitions - 1)
  }
}

function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase()
}

function clearSensitiveBrowserState() {
  if (typeof window === 'undefined') return

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith('medstart-')) window.localStorage.removeItem(key)
    }
  } catch {
    // Browser storage cleanup is best effort only.
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
      profile.status === 'blocked' ? 'Аккаунт заблокирован.' : 'Аккаунт удалён.',
    )
  }
}

async function sendVerification(credential: UserCredential) {
  auth.useDeviceLanguage()
  await sendEmailVerification(credential.user)
}

async function assertVerifiedEmail(credential: UserCredential) {
  await credential.user.reload()
  if (credential.user.emailVerified) {
    await credential.user.getIdToken(true)
    return
  }

  try {
    await sendVerification(credential)
    await secureSignOut()
    throw new EmailVerificationRequiredError(VERIFY_EMAIL_SENT_MESSAGE, true)
  } catch (error) {
    if (error instanceof EmailVerificationRequiredError) throw error
    await secureSignOut()

    if (error instanceof FirebaseError && error.code === 'auth/too-many-requests') {
      throw new EmailVerificationRequiredError(
        VERIFY_EMAIL_RATE_LIMIT_MESSAGE,
        false,
      )
    }

    throw new EmailVerificationRequiredError(
      error instanceof FirebaseError
        ? `${VERIFY_EMAIL_FAILED_MESSAGE} (${error.code})`
        : VERIFY_EMAIL_FAILED_MESSAGE,
      false,
    )
  }
}

export function login(email: string, password: string): Promise<AuthSession> {
  return runAuthTransition(async () => {
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizeAuthEmail(email),
      password,
    )

    try {
      await assertVerifiedEmail(credential)
      const profile = await getUserProfile(credential.user.uid)

      if (!profile) {
        await secureSignOut()
        throw new Error(
          'Аккаунт найден, но профиль MedStart отсутствует. Зарегистрируйтесь заново с этой почтой или обратитесь в поддержку.',
        )
      }

      await assertAccess(profile)
      return { credential, profile }
    } catch (error) {
      if (auth.currentUser?.uid === credential.user.uid) {
        await secureSignOut().catch(() => undefined)
      }
      throw error
    }
  })
}

async function registerWithProfile(
  email: string,
  password: string,
  createProfile: (uid: string) => Promise<UserProfile>,
): Promise<AuthSession> {
  return runAuthTransition(async () => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      normalizeAuthEmail(email),
      password,
    )

    let profile: UserProfile
    try {
      profile = await createProfile(credential.user.uid)
    } catch (error) {
      await deleteUser(credential.user).catch(() => undefined)
      await secureSignOut().catch(() => undefined)
      throw error
    }

    try {
      await sendVerification(credential)
    } catch (error) {
      await secureSignOut().catch(() => undefined)
      if (error instanceof FirebaseError && error.code === 'auth/too-many-requests') {
        throw new Error(VERIFY_EMAIL_RATE_LIMIT_MESSAGE)
      }
      throw new Error(
        error instanceof FirebaseError
          ? `${VERIFY_EMAIL_FAILED_MESSAGE} (${error.code})`
          : VERIFY_EMAIL_FAILED_MESSAGE,
      )
    }

    await secureSignOut()
    return { credential, profile }
  })
}

export function registerStudent(input: StudentRegistrationInput) {
  return registerWithProfile(input.email, input.password, (uid) =>
    createUserProfile({
      uid,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizeAuthEmail(input.email),
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
      email: normalizeAuthEmail(input.email),
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
  await authReady
  await secureSignOut()
  if (typeof window !== 'undefined') {
    window.location.replace('/login?loggedOut=1')
  }
}

export async function resetPassword(email: string): Promise<void> {
  await authReady
  auth.useDeviceLanguage()

  // Do not pass a Replit preview URL as actionCodeSettings. Firebase rejects
  // dynamic *.replit.dev hosts unless each one is manually allowlisted, which
  // prevented the reset request from being accepted and no email was sent.
  await sendPasswordResetEmail(auth, normalizeAuthEmail(email))
}

export async function resendEmailVerification(): Promise<void> {
  await authReady
  if (!auth.currentUser) throw new Error('Сначала войдите в аккаунт.')
  auth.useDeviceLanguage()
  await sendEmailVerification(auth.currentUser)
}

export { isOwnerUid } from './access-control'
