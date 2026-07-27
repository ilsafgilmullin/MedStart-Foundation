import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  clientAddress,
  isValidEmail,
  noStoreHeaders,
  normalizeEmail,
  takeRateLimit,
} from '@/lib/server/auth-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyAt4F5JQAdQPw8kmY-0dorxcaT_JX2d3v0'
const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'

interface IdentityResponse {
  localId?: string
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

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REQUEST' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  if (!isValidEmail(email) || !password || password.length > 128) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_CREDENTIALS' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  const limit = takeRateLimit(
    `login:${clientAddress(request)}:${email}`,
    10,
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

  try {
    const signedIn = await identityRequest('signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    })

    if (!signedIn.response.ok || !signedIn.payload.localId || !signedIn.payload.idToken) {
      const firebaseCode = signedIn.payload.error?.message || ''
      if (firebaseCode.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return NextResponse.json(
          { ok: false, code: 'TOO_MANY_REQUESTS' },
          { status: 429, headers: noStoreHeaders() },
        )
      }
      if (firebaseCode.includes('USER_DISABLED')) {
        return NextResponse.json(
          { ok: false, code: 'ACCOUNT_UNAVAILABLE' },
          { status: 403, headers: noStoreHeaders() },
        )
      }
      return NextResponse.json(
        { ok: false, code: 'INVALID_CREDENTIALS' },
        { status: 401, headers: noStoreHeaders() },
      )
    }

    const adminAuth = getFirebaseAdminAuth()
    const adminDb = getFirebaseAdminDb()
    const user = await adminAuth.getUser(signedIn.payload.localId)

    if (user.disabled) {
      return NextResponse.json(
        { ok: false, code: 'ACCOUNT_UNAVAILABLE' },
        { status: 403, headers: noStoreHeaders() },
      )
    }

    if (!user.emailVerified) {
      const verification = await identityRequest('sendOobCode', {
        requestType: 'VERIFY_EMAIL',
        idToken: signedIn.payload.idToken,
      })
      return NextResponse.json(
        {
          ok: false,
          code: 'EMAIL_NOT_VERIFIED',
          verificationSent: verification.response.ok,
        },
        { status: 403, headers: noStoreHeaders() },
      )
    }

    const profileSnapshot = await adminDb.collection('users').doc(user.uid).get()
    if (!profileSnapshot.exists) {
      return NextResponse.json(
        { ok: false, code: 'PROFILE_MISSING' },
        { status: 409, headers: noStoreHeaders() },
      )
    }

    const profile = profileSnapshot.data() as {
      role?: string
      status?: string
    }
    if (profile.status === 'blocked' || profile.status === 'deleted') {
      return NextResponse.json(
        { ok: false, code: 'ACCOUNT_UNAVAILABLE' },
        { status: 403, headers: noStoreHeaders() },
      )
    }

    const customToken = await adminAuth.createCustomToken(user.uid)
    return NextResponse.json(
      {
        ok: true,
        customToken,
        role: user.uid === OWNER_UID ? 'owner' : profile.role,
        status: profile.status,
      },
      { headers: noStoreHeaders() },
    )
  } catch (error) {
    console.error('MedStart server login failed', error)
    return NextResponse.json(
      { ok: false, code: 'AUTH_SERVICE_UNAVAILABLE' },
      { status: 503, headers: noStoreHeaders() },
    )
  }
}
