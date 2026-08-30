import { NextResponse } from 'next/server'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'
import {
  AppCheckAccessError,
  appCheckTokenForRequest,
} from '@/lib/server/app-check'
import {
  FirebaseAdminConfigurationError,
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'
import { firebaseIdentityRequest } from '@/lib/server/firebase-identity'
import {
  AuthSecurityConfigurationError,
  clientAddress,
  isValidEmail,
  noStoreHeaders,
  normalizeEmail,
  takeRateLimit,
} from '@/lib/server/auth-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  try {
    const appCheckToken = await appCheckTokenForRequest(request)
    const address = clientAddress(request)
    if (address) {
      const networkLimit = await takeRateLimit(`login:network:${address}`, 120)
      if (!networkLimit.allowed) {
        return rateLimited(networkLimit.retryAfterSeconds)
      }
    }

    // Account throttling is always enforced, even when proxy IP headers are not
    // trusted for this deployment.
    const accountLimit = await takeRateLimit(`login:account:${email}`, 10)
    if (!accountLimit.allowed) {
      return rateLimited(accountLimit.retryAfterSeconds)
    }

    const signedIn = await firebaseIdentityRequest(
      'signInWithPassword',
      {
        email,
        password,
        returnSecureToken: true,
      },
      appCheckToken,
    )

    if (
      !signedIn.response.ok ||
      !signedIn.payload.localId ||
      !signedIn.payload.idToken
    ) {
      const firebaseCode = signedIn.payload.error?.message || ''
      if (
        firebaseCode.includes('MISSING_APP_CREDENTIAL') ||
        firebaseCode.includes('INVALID_APP_CREDENTIAL')
      ) {
        return NextResponse.json(
          { ok: false, code: 'APP_CHECK_REQUIRED' },
          { status: 401, headers: noStoreHeaders() },
        )
      }
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
      const verification = await firebaseIdentityRequest(
        'sendOobCode',
        {
          requestType: 'VERIFY_EMAIL',
          idToken: signedIn.payload.idToken,
        },
        appCheckToken,
      )
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
        role: user.uid === PRIMARY_OWNER_UID ? 'owner' : profile.role,
        status: profile.status,
      },
      { headers: noStoreHeaders() },
    )
  } catch (error) {
    if (error instanceof AppCheckAccessError) {
      return NextResponse.json(
        { ok: false, code: 'APP_CHECK_REQUIRED' },
        { status: 401, headers: noStoreHeaders() },
      )
    }
    console.error('MedStart server login failed', error)
    return NextResponse.json(
      {
        ok: false,
        code:
          error instanceof FirebaseAdminConfigurationError ||
          error instanceof AuthSecurityConfigurationError
            ? 'AUTH_CONFIGURATION_ERROR'
            : 'AUTH_SERVICE_UNAVAILABLE',
      },
      { status: 503, headers: noStoreHeaders() },
    )
  }
}
