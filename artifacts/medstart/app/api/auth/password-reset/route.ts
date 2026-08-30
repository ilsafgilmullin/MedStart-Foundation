import { NextResponse } from 'next/server'
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
  let body: { email?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_REQUEST' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  const email = normalizeEmail(body.email)
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_EMAIL' },
      { status: 400, headers: noStoreHeaders() },
    )
  }

  try {
    const address = clientAddress(request)
    if (address) {
      const networkLimit = await takeRateLimit(
        `password-reset:network:${address}`,
        60,
      )
      if (!networkLimit.allowed) {
        return rateLimited(networkLimit.retryAfterSeconds)
      }
    }

    // Use the same account limiter regardless of whether Firebase knows this
    // address so password-reset responses do not become an enumeration oracle.
    const accountLimit = await takeRateLimit(
      `password-reset:account:${email}`,
      5,
    )
    if (!accountLimit.allowed) {
      return rateLimited(accountLimit.retryAfterSeconds)
    }

    const { response, payload } = await firebaseIdentityRequest('sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
    })

    if (!response.ok) {
      const firebaseCode = payload.error?.message || 'RESET_REQUEST_FAILED'
      if (firebaseCode.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return NextResponse.json(
          { ok: false, code: 'TOO_MANY_REQUESTS' },
          { status: 429, headers: noStoreHeaders() },
        )
      }
      if (firebaseCode.includes('INVALID_EMAIL')) {
        return NextResponse.json(
          { ok: false, code: 'INVALID_EMAIL' },
          { status: 400, headers: noStoreHeaders() },
        )
      }
      if (firebaseCode.includes('OPERATION_NOT_ALLOWED')) {
        return NextResponse.json(
          { ok: false, code: 'PASSWORD_AUTH_DISABLED' },
          { status: 503, headers: noStoreHeaders() },
        )
      }

      // Do not disclose whether the email exists in Firebase Auth.
      if (firebaseCode.includes('EMAIL_NOT_FOUND')) {
        return NextResponse.json({ ok: true }, { headers: noStoreHeaders() })
      }

      console.error('Firebase password reset request failed', firebaseCode)
      return NextResponse.json(
        { ok: false, code: 'RESET_REQUEST_FAILED' },
        { status: 502, headers: noStoreHeaders() },
      )
    }

    return NextResponse.json({ ok: true }, { headers: noStoreHeaders() })
  } catch (error) {
    console.error('Password reset proxy unavailable', error)
    return NextResponse.json(
      {
        ok: false,
        code:
          error instanceof AuthSecurityConfigurationError
            ? 'AUTH_CONFIGURATION_ERROR'
            : 'AUTH_SERVICE_UNAVAILABLE',
      },
      { status: 503, headers: noStoreHeaders() },
    )
  }
}
