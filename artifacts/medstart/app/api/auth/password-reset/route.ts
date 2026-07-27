import { NextResponse } from 'next/server'
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

  const limit = takeRateLimit(
    `password-reset:${clientAddress(request)}:${email}`,
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

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-firebase-locale': 'ru',
        },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    )

    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string }
    }

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
      { ok: false, code: 'AUTH_SERVICE_UNAVAILABLE' },
      { status: 503, headers: noStoreHeaders() },
    )
  }
}
