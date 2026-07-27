import { NextResponse } from 'next/server'
import {
  FirebaseAdminConfigurationError,
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
  getFirebaseAdminProjectId,
} from '@/lib/server/firebase-admin'
import { noStoreHeaders } from '@/lib/server/auth-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error('AUTH_HEALTH_TIMEOUT')),
        timeoutMs,
      )
      timer.unref?.()
    }),
  ])
}

export async function GET() {
  try {
    const adminAuth = getFirebaseAdminAuth()
    const adminDb = getFirebaseAdminDb()
    const [owner, profile] = await withTimeout(
      Promise.all([
        adminAuth.getUser(OWNER_UID),
        adminDb.collection('users').doc(OWNER_UID).get(),
      ]),
      8_000,
    )

    const healthy =
      !owner.disabled && owner.emailVerified && profile.exists

    return NextResponse.json(
      {
        ok: healthy,
        checks: {
          serverCredentials: true,
          project: getFirebaseAdminProjectId(),
          ownerAccount: !owner.disabled && owner.emailVerified,
          ownerProfile: profile.exists,
        },
      },
      {
        status: healthy ? 200 : 503,
        headers: noStoreHeaders(),
      },
    )
  } catch (error) {
    const configurationError = error instanceof FirebaseAdminConfigurationError
    console.error('MedStart authentication health check failed', error)

    return NextResponse.json(
      {
        ok: false,
        code: configurationError
          ? 'AUTH_CONFIGURATION_ERROR'
          : 'AUTH_DEPENDENCY_UNAVAILABLE',
        checks: {
          serverCredentials: false,
          ownerAccount: false,
          ownerProfile: false,
        },
      },
      { status: 503, headers: noStoreHeaders() },
    )
  }
}
