import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import {
  FirebaseAdminConfigurationError,
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'
import { firebaseIdentityRequest } from '@/lib/server/firebase-identity'
import { schoolTrackEnabled } from '@/lib/server/feature-flags'
import {
  isSchoolGradeCompatible,
  subjectsForExam,
  type LearnerTrack,
  type SchoolExam,
} from '@/lib/education'
import {
  AuthSecurityConfigurationError,
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
  learnerTrack?: unknown
  fieldOfStudy?: unknown
  studyYear?: unknown
  schoolGrade?: unknown
  schoolExam?: unknown
  schoolConsentConfirmed?: unknown
  specialization?: unknown
  subjects?: unknown
  tutorAudiences?: unknown
  examTypes?: unknown
  institution?: unknown
  experience?: unknown
  bio?: unknown
  city?: unknown
  lessonPrice?: unknown
  lessonDuration?: unknown
  lessonFormats?: unknown
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

function normalizeLearnerTrack(value: unknown): LearnerTrack {
  return value === 'school' ? 'school' : 'medical'
}

function normalizeSchoolExam(value: unknown): SchoolExam | null {
  return value === 'oge' || value === 'ege' ? value : null
}

function normalizeTutorAudiences(value: unknown): LearnerTrack[] {
  if (value === undefined) return ['medical']
  if (!Array.isArray(value)) return []
  const audiences = value.filter(
    (item): item is LearnerTrack => item === 'medical' || item === 'school',
  )
  return [...new Set(audiences)].slice(0, 2)
}

function normalizeExamTypes(value: unknown): SchoolExam[] {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value.filter(
        (item): item is SchoolExam => item === 'oge' || item === 'ege',
      ),
    ),
  ].slice(0, 2)
}

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, code: 'TOO_MANY_REQUESTS' },
    {
      status: 429,
      headers: noStoreHeaders({
        'retry-after': String(Math.max(1, retryAfterSeconds)),
      }),
    },
  )
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
  const learnerTrack = normalizeLearnerTrack(body.learnerTrack)
  const schoolGrade = cleanText(body.schoolGrade, 2)
  const schoolExam = normalizeSchoolExam(body.schoolExam)
  const subjects = normalizeSubjects(body.subjects)
  const tutorAudiences = normalizeTutorAudiences(body.tutorAudiences)
  const examTypes = normalizeExamTypes(body.examTypes)
  const schoolEnabled = schoolTrackEnabled()

  if (
    !schoolEnabled &&
    ((role === 'student' && learnerTrack === 'school') ||
      (role === 'tutor' && tutorAudiences.includes('school')))
  ) {
    return NextResponse.json(
      { ok: false, code: 'SCHOOL_TRACK_DISABLED' },
      { status: 403, headers: noStoreHeaders() },
    )
  }

  if (role === 'tutor' && !specialization) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REGISTRATION' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  if (role === 'tutor' && tutorAudiences.length === 0) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REGISTRATION' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  if (role === 'student' && learnerTrack === 'school') {
    const allowedSubjects = new Set(
      schoolExam
        ? subjectsForExam(schoolExam).map((subject) => subject.value)
        : [],
    )
    const validSchoolProfile =
      schoolExam &&
      isSchoolGradeCompatible(schoolExam, schoolGrade) &&
      body.schoolConsentConfirmed === true &&
      subjects.length > 0 &&
      subjects.every((subject) => allowedSubjects.has(subject))

    if (!validSchoolProfile) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_REGISTRATION' },
        { status: 400, headers: noStoreHeaders() },
      )
    }
  }

  if (
    role === 'tutor' &&
    tutorAudiences.includes('school') &&
    (examTypes.length === 0 || subjects.length === 0)
  ) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REGISTRATION' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  let adminAuth: AdminAuth | undefined
  let adminDb: AdminDb | undefined
  let createdUid = ''

  try {
    const address = clientAddress(request)
    if (address) {
      const networkLimit = await takeRateLimit(
        `register:network:${address}`,
        30,
      )
      if (!networkLimit.allowed) {
        return rateLimited(networkLimit.retryAfterSeconds)
      }
    }

    const accountLimit = await takeRateLimit(`register:account:${email}`, 5)
    if (!accountLimit.allowed) {
      return rateLimited(accountLimit.retryAfterSeconds)
    }

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
    const educationProfile =
      role === 'student'
        ? {
            learnerTrack,
            fieldOfStudy:
              learnerTrack === 'medical'
                ? cleanText(body.fieldOfStudy, 120)
                : '',
            studyYear:
              learnerTrack === 'medical' ? cleanText(body.studyYear, 20) : '',
            subjects: learnerTrack === 'school' ? subjects : [],
            ...(learnerTrack === 'school'
              ? {
                  schoolGrade,
                  schoolExam,
                  schoolConsentConfirmed: true,
                }
              : {}),
          }
        : {
            tutorAudiences,
            examTypes: tutorAudiences.includes('school') ? examTypes : [],
            subjects,
          }

    const profile = {
      uid: user.uid,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      email,
      role,
      status: role === 'student' ? 'active' : 'pending',
      avatar: '',
      title: '',
      specialization: role === 'tutor' ? specialization : '',
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
      ...educationProfile,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const profileRef = adminDb.collection('users').doc(user.uid)
    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(profileRef)
      if (existing.exists) throw new Error('PROFILE_ALREADY_EXISTS')
      transaction.set(profileRef, profile)
    })

    const signedIn = await firebaseIdentityRequest('signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    })

    let verificationSent = false
    if (signedIn.response.ok && signedIn.payload.idToken) {
      const verification = await firebaseIdentityRequest('sendOobCode', {
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

    if (
      error instanceof FirebaseAdminConfigurationError ||
      error instanceof AuthSecurityConfigurationError
    ) {
      return NextResponse.json(
        { ok: false, code: 'AUTH_CONFIGURATION_ERROR' },
        { status: 503, headers: noStoreHeaders() },
      )
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
