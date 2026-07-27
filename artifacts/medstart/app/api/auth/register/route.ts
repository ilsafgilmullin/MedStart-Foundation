import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  cleanText,
  clientAddress,
  isValidEmail,
  noStoreHeaders,
  normalizeEmail,
  passwordProblems,
  takeRateLimit,
} from '@/lib/server/auth-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyAt4F5JQAdQPw8kmY-0dorxcaT_JX2d3v0'
const OWNER_EMAIL = 'ilsafgilmullin@yandex.ru'

type Role = 'student' | 'tutor'
type LessonFormat = 'online' | 'in_person'
type AdminAuth = ReturnType<typeof getFirebaseAdminAuth>
type AdminDb = ReturnType<typeof getFirebaseAdminDb>

interface RegistrationBody {
  role?: unknown
  firstName?: unknown
  lastName?: unknown
  email?: unknown
  password?: unknown
  fieldOfStudy?: unknown
  studyYear?: unknown
  specialization?: unknown
  subjects?: unknown
  institution?: unknown
  experience?: unknown
  bio?: unknown
  city?: unknown
  lessonPrice?: unknown
  lessonDuration?: unknown
  lessonFormats?: unknown
}

interface IdentityResponse {
  idToken?: string
  error?: { message?: string }
}

async function identityRequest(operation: string, body: unknown) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-firebase-locale': 'ru',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    },
  )
  const payload = (await response.json().catch(() => ({}))) as IdentityResponse
  return { response, payload }
}

function normalizeSubjects(value: unknown) {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 120))
        .filter(Boolean),
    ),
  ].slice(0, 30)
}

function normalizeFormats(value: unknown): LessonFormat[] {
  if (!Array.isArray(value)) return ['online']
  const formats = value.filter(
    (item): item is LessonFormat => item === 'online' || item === 'in_person',
  )
  return formats.length ? [...new Set(formats)].slice(0, 2) : ['online']
}

export async function POST(request: Request) {
  let body: RegistrationBody
  try {
    body = (await request.json()) as RegistrationBody
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REQUEST' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  const role: Role | null =
    body.role === 'student' || body.role === 'tutor' ? body.role : null
  const firstName = cleanText(body.firstName, 80)
  const lastName = cleanText(body.lastName, 80)
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''

  if (
    !role ||
    !firstName ||
    !lastName ||
    !isValidEmail(email) ||
    passwordProblems(password).length > 0
  ) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REGISTRATION' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  if (email === OWNER_EMAIL) {
    return NextResponse.json(
      { ok: false, code: 'ACCOUNT_UNAVAILABLE' },
      { status: 409, headers: noStoreHeaders() },
    )
  }

  const specialization = cleanText(body.specialization, 180)
  if (role === 'tutor' && !specialization) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REGISTRATION' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  const limit = takeRateLimit(
    `register:${clientAddress(request)}:${email}`,
    5,
  )
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, code: 'TOO_MANY_REQUESTS' },
      {
        status: 429,
        headers: noStoreHeaders({ 'retry-after': String(limit.retryAfterSeconds) }),
      },
    )
  }

  let adminAuth: AdminAuth | undefined
  let adminDb: AdminDb | undefined
  let createdUid = ''

  try {
    adminAuth = getFirebaseAdminAuth()
    adminDb = getFirebaseAdminDb()

    const user = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false,
      disabled: false,
    })
    createdUid = user.uid

    const lessonPrice = Math.max(
      0,
      Math.min(1_000_000, Number(body.lessonPrice) || 0),
    )
    const lessonDuration = Math.max(
      30,
      Math.min(180, Math.round(Number(body.lessonDuration) || 60)),
    )

    const profile = {
      uid: user.uid,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      email,
      role,
      status: role === 'student' ? 'active' : 'pending',
      avatar: '',
      fieldOfStudy: role === 'student' ? cleanText(body.fieldOfStudy, 120) : '',
      studyYear: role === 'student' ? cleanText(body.studyYear, 20) : '',
      title: '',
      specialization: role === 'tutor' ? specialization : '',
      subjects: role === 'tutor' ? normalizeSubjects(body.subjects) : [],
      institution: role === 'tutor' ? cleanText(body.institution, 240) : '',
      experience: role === 'tutor' ? cleanText(body.experience, 120) : '',
      bio: role === 'tutor' ? cleanText(body.bio, 4000) : '',
      city: role === 'tutor' ? cleanText(body.city, 160) : '',
      lessonPrice: role === 'tutor' ? lessonPrice : 0,
      lessonDuration: role === 'tutor' ? lessonDuration : 60,
      lessonFormats:
        role === 'tutor' ? normalizeFormats(body.lessonFormats) : ['online'],
      timezone: 'Europe/Moscow',
      rating: 0,
      reviewsCount: 0,
      isPublic: false,
      notificationPreferences: {
        bookingUpdates: true,
        newMessages: true,
        lessonReminders: true,
        productNews: false,
      },
      onboardingCompleted: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const profileRef = adminDb.collection('users').doc(user.uid)
    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(profileRef)
      if (existing.exists) throw new Error('PROFILE_ALREADY_EXISTS')
      transaction.set(profileRef, profile)
    })

    const signedIn = await identityRequest('signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    })

    let verificationSent = false
    if (signedIn.response.ok && signedIn.payload.idToken) {
      const verification = await identityRequest('sendOobCode', {
        requestType: 'VERIFY_EMAIL',
        idToken: signedIn.payload.idToken,
      })
      verificationSent = verification.response.ok
    }

    return NextResponse.json(
      { ok: true, verificationSent },
      { status: 201, headers: noStoreHeaders() },
    )
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : ''

    if (createdUid && adminAuth && adminDb) {
      await Promise.allSettled([
        adminDb.collection('users').doc(createdUid).delete(),
        adminAuth.deleteUser(createdUid),
      ])
    }

    if (code.includes('email-already-exists')) {
      return NextResponse.json(
        { ok: false, code: 'ACCOUNT_UNAVAILABLE' },
        { status: 409, headers: noStoreHeaders() },
      )
    }
    if (code.includes('invalid-password') || code.includes('invalid-email')) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_REGISTRATION' },
        { status: 400, headers: noStoreHeaders() },
      )
    }

    console.error('MedStart server registration failed', error)
    return NextResponse.json(
      { ok: false, code: 'AUTH_SERVICE_UNAVAILABLE' },
      { status: 503, headers: noStoreHeaders() },
    )
  }
}
