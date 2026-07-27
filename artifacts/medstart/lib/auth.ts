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

export interface RegistrationResult extends AuthSession {
  verificationSent: boolean
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
  'Почта не подтверждена. Новое письмо отправлено. Проверьте «Входящие» и «Спам», откройте ссылку из письма MedStart, затем войдите снова.'

const VERIFY_EMAIL_RATE_LIMIT_MESSAGE =
  'Почта не подтверждена. Письмо уже недавно отправлялось. Проверьте «Входящие» и «Спам», затем повторите вход.'

const VERIFY_EMAIL_FAILED_MESSAGE =
  'Почта не подтверждена, но новое письмо сейчас отправить не удалось. Повторите попытку позже.'

let activeAuthTransitions = 0

export function isAuthTransitionInProgress() {
  return activeAuthTransitions > 0
}

async function runAuthTransition<T>(operation: () => Promise<T>): Promise<T> {
  activeAuthTransitions += 1
  try {
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
  if (credential.user.emailVerified) {
    // Verification may have happened in another browser tab. A forced token
    // refresh makes the email_verified claim immediately available to
    // Firestore rules and to AuthProvider's token listener.
    await credential.user.getIdToken(true)
    return
  }

  auth.useDeviceLanguage()

  try {
    await sendEmailVerification(credential.user)
    await secureSignOut()
    throw new EmailVerificationRequiredError(VERIFY_EMAIL_SENT_MESSAGE, true)
  } catch (error) {
    if (error instanceof EmailVerificationRequiredError) throw error

    await secureSignOut().catch(() => undefined)

    if (
      error instanceof FirebaseError &&
      error.code === 'auth/too-many-requests'
    ) {
      throw new EmailVerificationRequiredError(
        VERIFY_EMAIL_RATE_LIMIT_MESSAGE,
        false,
      )
    }

    throw new EmailVerificationRequiredError(
      VERIFY_EMAIL_FAILED_MESSAGE,
      false,
    )
  }
}

export function login(
  email: string,
  password: string,
): Promise<AuthSession> {
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
          'Учётная запись существует, но профиль MedStart не найден. Обратитесь в поддержку и не создавайте второй аккаунт.',
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
): Promise<RegistrationResult> {
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
      // A failed profile write must not leave a login-only orphan account.
      await deleteUser(credential.user).catch(() => undefined)
      await secureSignOut().catch(() => undefined)
      throw error
    }

    auth.useDeviceLanguage()
    let verificationSent = false
    try {
      await sendEmailVerification(credential.user)
      verificationSent = true
    } catch {
      // The account and protected profile are already created. Treat delivery
      // failure as a recoverable state: the next login attempt safely retries
      // the verification email instead of trapping the user behind
      // auth/email-already-in-use.
      verificationSent = false
    } finally {
      await secureSignOut().catch(() => undefined)
    }

    return { credential, profile, verificationSent }
  })
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

export async function resetPassword(email: string): Promise<void> {
  auth.useDeviceLanguage()

  // Do not attach the current Replit preview origin as a continue URL. Replit
  // development hostnames are dynamic and Firebase rejects unallowlisted
  // domains before sending the email. The default Firebase action handler is
  // stable, works from every preview, and returns the user to MedStart manually.
  await sendPasswordResetEmail(auth, normalizeAuthEmail(email))
}

export async function resendEmailVerification(): Promise<void> {
  if (!auth.currentUser) throw new Error('Сначала войдите в аккаунт.')
  auth.useDeviceLanguage()
  await sendEmailVerification(auth.currentUser)
}

export { isOwnerUid } from './access-control'
