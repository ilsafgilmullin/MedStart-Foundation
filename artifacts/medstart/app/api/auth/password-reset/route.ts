import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyAt4F5JQAdQPw8kmY-0dorxcaT_JX2d3v0'

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_REQUEST' }, { status: 400 })
  }

  const email = normalizeEmail((body as { email?: unknown })?.email)
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, code: 'INVALID_EMAIL' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
          { status: 429 },
        )
      }
      if (firebaseCode.includes('INVALID_EMAIL')) {
        return NextResponse.json({ ok: false, code: 'INVALID_EMAIL' }, { status: 400 })
      }
      if (firebaseCode.includes('OPERATION_NOT_ALLOWED')) {
        return NextResponse.json(
          { ok: false, code: 'PASSWORD_AUTH_DISABLED' },
          { status: 503 },
        )
      }

      console.error('Firebase password reset request failed', firebaseCode)
      return NextResponse.json(
        { ok: false, code: 'RESET_REQUEST_FAILED' },
        { status: 502 },
      )
    }

    // Always return the same response. Firebase may intentionally hide whether
    // an address exists, and MedStart must not expose registered emails.
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Password reset proxy unavailable', error)
    return NextResponse.json(
      { ok: false, code: 'AUTH_SERVICE_UNAVAILABLE' },
      { status: 503 },
    )
  }
}
