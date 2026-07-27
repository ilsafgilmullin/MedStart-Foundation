import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'medstart-e9bfe'
const API_KEY = 'AIzaSyAt4F5JQAdQPw8kmY-0dorxcaT_JX2d3v0'
const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const OWNER_EMAIL = 'ilsafgilmullin@yandex.ru'
const REPORT_PATH = 'auth-live-audit-report.json'

const adminApp =
  getApps().find((app) => app.name === 'medstart-live-auth-audit') ||
  initializeApp(
    {
      credential: applicationDefault(),
      projectId: PROJECT_ID,
    },
    'medstart-live-auth-audit',
  )
const adminAuth = getAuth(adminApp)
const adminDb = getFirestore(adminApp)

const report = {
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  status: 'running',
  owner: null,
  checks: [],
}

function check(name, details = {}) {
  report.checks.push({ name, status: 'passed', ...details })
  console.log(`AUTH_LIVE_CHECK=${name}:passed`)
}

function safeError(error) {
  if (error instanceof Error) return error.message.slice(0, 500)
  return String(error).slice(0, 500)
}

async function identityRequest(operation, body, options = {}) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-firebase-locale': 'ru',
      },
      body: JSON.stringify(body),
    },
  )
  const payload = await response.json().catch(() => ({}))

  if (options.expectError) {
    if (response.ok) {
      throw new Error(`${operation} unexpectedly succeeded`)
    }
    const message = String(payload?.error?.message || '')
    if (
      options.allowedErrors?.length &&
      !options.allowedErrors.some((allowed) => message.includes(allowed))
    ) {
      throw new Error(`${operation} returned unexpected error: ${message || response.status}`)
    }
    return payload
  }

  if (!response.ok) {
    throw new Error(
      `${operation} failed: ${String(payload?.error?.message || response.status)}`,
    )
  }
  return payload
}

function firestoreValue(value) {
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value }
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } }
  }
  if (value && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [key, firestoreValue(nested)]),
        ),
      },
    }
  }
  return { nullValue: null }
}

function profileDocument(uid, email) {
  const now = new Date().toISOString()
  const data = {
    uid,
    firstName: 'Live',
    lastName: 'Audit',
    displayName: 'Live Audit',
    email,
    role: 'student',
    status: 'active',
    avatar: '',
    fieldOfStudy: 'medicine',
    studyYear: '1',
    title: '',
    specialization: '',
    subjects: [],
    institution: '',
    experience: '',
    bio: '',
    city: '',
    lessonPrice: 0,
    lessonDuration: 60,
    lessonFormats: ['online'],
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
  }
  return {
    fields: {
      ...Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, firestoreValue(value)]),
      ),
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
    },
  }
}

function profileUrl(uid) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`
}

async function writeProfileWithToken(uid, email, idToken) {
  const response = await fetch(profileUrl(uid), {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(profileDocument(uid, email)),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      `Firestore registration profile write failed: ${String(payload?.error?.message || response.status)}`,
    )
  }
}

async function readProfileWithToken(uid, idToken, expectedStatus) {
  const response = await fetch(profileUrl(uid), {
    headers: { authorization: `Bearer ${idToken}` },
  })
  if (response.status !== expectedStatus) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(
      `Firestore profile read returned ${response.status}, expected ${expectedStatus}: ${String(payload?.error?.message || '')}`,
    )
  }
}

let auditUid = ''
let failure

try {
  const owner = await adminAuth.getUser(OWNER_UID)
  const ownerEmail = (owner.email || '').trim().toLowerCase()
  if (ownerEmail !== OWNER_EMAIL) {
    throw new Error(`Owner email mismatch: ${ownerEmail || '(missing)'}`)
  }
  if (owner.disabled) throw new Error('Owner account is disabled')
  if (!owner.emailVerified) throw new Error('Owner email is not verified')

  const ownerProfile = await adminDb.doc(`users/${OWNER_UID}`).get()
  if (!ownerProfile.exists) throw new Error('Owner Firestore profile is missing')

  report.owner = {
    uid: OWNER_UID,
    email: OWNER_EMAIL,
    disabled: owner.disabled,
    emailVerified: owner.emailVerified,
    profileExists: ownerProfile.exists,
    role: ownerProfile.data()?.role || null,
    status: ownerProfile.data()?.status || null,
  }
  check('owner-account-consistency')

  const auditId = randomUUID().replaceAll('-', '').slice(0, 20)
  const auditEmail = `medstart-auth-audit-${auditId}@example.com`
  const auditPassword = `Ms!${randomUUID()}Aa1`

  const signUp = await identityRequest('signUp', {
    email: auditEmail,
    password: auditPassword,
    returnSecureToken: true,
  })
  auditUid = String(signUp.localId || '')
  if (!auditUid || !signUp.idToken) throw new Error('Firebase sign-up returned incomplete credentials')
  check('email-password-provider-enabled')

  await writeProfileWithToken(auditUid, auditEmail, signUp.idToken)
  check('unverified-registration-profile-write')

  await readProfileWithToken(auditUid, signUp.idToken, 403)
  check('unverified-private-profile-read-blocked')

  await identityRequest('sendOobCode', {
    requestType: 'VERIFY_EMAIL',
    idToken: signUp.idToken,
  })
  check('verification-email-request-accepted')

  await adminAuth.updateUser(auditUid, { emailVerified: true, disabled: false })
  const verifiedSignIn = await identityRequest('signInWithPassword', {
    email: auditEmail,
    password: auditPassword,
    returnSecureToken: true,
  })
  const decoded = await adminAuth.verifyIdToken(verifiedSignIn.idToken, true)
  if (!decoded.email_verified) throw new Error('Refreshed ID token lacks email_verified=true')
  check('verified-token-refresh')

  await readProfileWithToken(auditUid, verifiedSignIn.idToken, 200)
  check('verified-profile-read')

  await identityRequest(
    'signInWithPassword',
    {
      email: auditEmail,
      password: `${auditPassword}-wrong`,
      returnSecureToken: true,
    },
    {
      expectError: true,
      allowedErrors: ['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD'],
    },
  )
  check('wrong-password-rejected')

  await identityRequest('sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email: auditEmail,
  })
  check('password-reset-with-default-handler')

  if (process.env.SEND_OWNER_RESET === 'true') {
    await identityRequest('sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email: OWNER_EMAIL,
    })
    check('owner-password-reset-requested')
  }

  report.status = 'passed'
  console.log('AUTH_LIVE_STATUS=passed')
} catch (error) {
  failure = error
  report.status = 'failed'
  report.error = safeError(error)
  console.error(`AUTH_LIVE_STATUS=failed: ${safeError(error)}`)
} finally {
  if (auditUid) {
    await adminDb.recursiveDelete(adminDb.doc(`users/${auditUid}`)).catch(() => undefined)
    await adminAuth.deleteUser(auditUid).catch(() => undefined)
  }
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

if (failure) throw failure
