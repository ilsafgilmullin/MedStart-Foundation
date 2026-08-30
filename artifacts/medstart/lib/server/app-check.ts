import 'server-only'

import { getFirebaseAdminAppCheck } from '@/lib/server/firebase-admin'

const APP_CHECK_HEADER = 'x-firebase-appcheck'
const MAX_APP_CHECK_TOKEN_LENGTH = 8192

export class AppCheckAccessError extends Error {
  readonly code = 'APP_CHECK_REQUIRED'

  constructor(message = 'Firebase App Check token is required.') {
    super(message)
    this.name = 'AppCheckAccessError'
  }
}

export function appCheckEnforcementEnabled() {
  const value = String(
    process.env.MEDSTART_APP_CHECK_ENFORCEMENT_ENABLED || '',
  )
    .trim()
    .toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
}

function tokenFromRequest(request: Request) {
  const token = String(request.headers.get(APP_CHECK_HEADER) || '').trim()
  if (!token || token.length > MAX_APP_CHECK_TOKEN_LENGTH) return ''
  return token
}

/**
 * Returns the client App Check token so trusted server-to-Firebase REST calls
 * can forward it. When server enforcement is enabled the token is verified
 * before the request is allowed to continue.
 */
export async function appCheckTokenForRequest(request: Request) {
  const token = tokenFromRequest(request)
  if (!appCheckEnforcementEnabled()) return token
  if (!token) throw new AppCheckAccessError()

  try {
    await getFirebaseAdminAppCheck().verifyToken(token)
  } catch {
    throw new AppCheckAccessError('Firebase App Check token is invalid.')
  }

  return token
}
