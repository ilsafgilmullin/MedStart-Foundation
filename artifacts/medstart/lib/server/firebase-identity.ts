import 'server-only'

import { firebasePublicConfig } from '@/lib/firebase-public-config'

export interface FirebaseIdentityPayload {
  localId?: string
  idToken?: string
  email?: string
  error?: { message?: string }
}

export async function firebaseIdentityRequest<
  T extends FirebaseIdentityPayload = FirebaseIdentityPayload,
>(operation: string, body: unknown, appCheckToken = '') {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-firebase-locale': 'ru',
  }
  if (appCheckToken) headers['x-firebase-appcheck'] = appCheckToken

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(firebasePublicConfig.apiKey)}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    },
  )

  const payload = (await response.json().catch(() => ({}))) as T
  return { response, payload }
}
