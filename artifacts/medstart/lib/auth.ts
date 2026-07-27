import {
  sendEmailVerification,
  signInWithCustomToken,
  signOut,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './firebase'
import { getUserProfile } from './firestore'
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

export interface RegistrationResult {
  verificationSent: boolean
}

interface AuthApiResponse {
  ok?: boolean
  code?: string
  customToken?: string
  verificationSent?: boolean
}

export class MedStartAuthError extends Error {
  readonly code: string

  constructor(code: string, message = 'Не удалось выполнить операцию.') {
    super(message)
    this.name = 'MedStartAuthError'
    this.code = code
  }
}

export class EmailVerificationRequiredError extends Error {
  readonly verificationSent: boolean

  constructor(message: string, verificationSent: boolean) {
    super(message)
    this.name = 'EmailVerificationRequiredError'
    this.verificationSent = verificationSent
  }
}

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
    // Private browsing may disable storage.
  }
  try {
    window.sessionStorage.clear()
  } catch {
    // Best-effort cleanup.
  }
}

async function secureSignOut() {
  try {
    await signOut(auth)
  } finally {
    clearSensitiveBrowserState()
  }
}

async function authRequest(path: string, body: unknown): Promise<AuthApiResponse> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new MedStartAuthError(
      'AUTH_SERVICE_UNAVAILABLE',
      'Сервер MedStart временно недоступен. Проверьте интернет и повторите.',
    )
  }

  const result = (await response.json().catch(() => ({}))) as AuthApiResponse
  if (!response.ok || !result.ok) {
    if (result.code === 'EMAIL_NOT_VERIFIED') {
      throw new EmailVerificationRequiredError(
        result.verificationSent
          ? 'Почта не подтверждена. Новое письмо отправлено сервером MedStart. Проверьте «Входящие» и «Спам».'
          : 'Почта не подтверждена. Письмо сейчас отправить не удалось; повторите вход позже.',
        Boolean(result.verificationSent),
      )
    }
    throw new MedStartAuthError(result.code || 'AUTH_FAILED')
  }
  return result
}

async function assertProfileAccess(profile: UserProfile) {
  if (profile.status === 'blocked' || profile.status === 'deleted') {
    await secureSignOut()
    throw new MedStartAuthError('ACCOUNT_UNAVAILABLE')
  }
}

export function login(email: string, password: string): Promise<AuthSession> {
  return runAuthTransition(async () => {
    await secureSignOut().catch(() => undefined)
    const result = await authRequest('/api/auth/login', {
      email: normalizeAuthEmail(email),
      password,
    })
    if (!result.customToken) {
      throw new MedStartAuthError('AUTH_SERVICE_UNAVAILABLE')
    }

    const credential = await signInWithCustomToken(auth, result.customToken)
    await credential.user.reload()
    await credential.user.getIdToken(true)

    const profile = await getUserProfile(credential.user.uid)
    if (!profile) {
      await secureSignOut()
      throw new MedStartAuthError('PROFILE_MISSING')
    }
    await assertProfileAccess(profile)
    return { credential, profile }
  })
}

async function register(
  role: 'student' | 'tutor',
  input: StudentRegistrationInput | TutorRegistrationInput,
): Promise<RegistrationResult> {
  const result = await authRequest('/api/auth/register', {
    role,
    ...input,
    email: normalizeAuthEmail(input.email),
  })
  return { verificationSent: Boolean(result.verificationSent) }
}

export function registerStudent(input: StudentRegistrationInput) {
  return register('student', input)
}

export function registerTutor(input: TutorRegistrationInput) {
  return register('tutor', input)
}

export async function logout(): Promise<void> {
  await secureSignOut()
  if (typeof window !== 'undefined') {
    window.location.replace('/login?loggedOut=1')
  }
}

export async function resetPassword(email: string): Promise<void> {
  await authRequest('/api/auth/password-reset', {
    email: normalizeAuthEmail(email),
  })
}

export async function resendEmailVerification(): Promise<void> {
  if (!auth.currentUser) throw new Error('Сначала войдите в аккаунт.')
  auth.useDeviceLanguage()
  await sendEmailVerification(auth.currentUser)
}

export { isOwnerUid } from './access-control'
