import 'server-only'

import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdminDb } from '@/lib/server/firebase-admin'

const WINDOW_MS = 15 * 60 * 1000
const RETENTION_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_COLLECTION = 'securityRateLimits'

export class AuthSecurityConfigurationError extends Error {
  readonly code = 'AUTH_SECURITY_CONFIGURATION_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'AuthSecurityConfigurationError'
  }
}

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export function passwordProblems(password: string) {
  const problems: string[] = []
  if (password.length < 10) problems.push('MIN_LENGTH')
  if (!/[a-zа-яё]/i.test(password)) problems.push('LETTER')
  if (!/\d/.test(password)) problems.push('NUMBER')
  if (password.length > 128) problems.push('MAX_LENGTH')
  return problems
}

function trustedProxyHeadersEnabled() {
  return ['1', 'true', 'yes'].includes(
    process.env.MEDSTART_TRUST_PROXY_HEADERS?.trim().toLowerCase() || '',
  )
}

/**
 * Proxy-provided client IP data is security-sensitive and is ignored by
 * default. Enable MEDSTART_TRUST_PROXY_HEADERS only after the deployment proxy
 * is verified to overwrite these headers rather than accepting them verbatim
 * from the public client.
 */
export function clientAddress(request: Request): string | null {
  if (!trustedProxyHeadersEnabled()) return null

  const forwarded = request.headers.get('x-forwarded-for')
  const candidates = [
    forwarded?.split(',')[0]?.trim(),
    request.headers.get('x-real-ip')?.trim(),
  ]

  for (const candidate of candidates) {
    if (candidate && isIP(candidate)) return candidate
  }
  return null
}

function rateLimitPepper() {
  const pepper = process.env.MEDSTART_RATE_LIMIT_PEPPER?.trim() || ''
  if (Buffer.byteLength(pepper, 'utf8') < 32) {
    throw new AuthSecurityConfigurationError(
      'MEDSTART_RATE_LIMIT_PEPPER must contain at least 32 bytes.',
    )
  }
  return pepper
}

function rateLimitDocumentId(key: string) {
  return createHmac('sha256', rateLimitPepper()).update(key).digest('hex')
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

/**
 * Distributed fixed-window rate limiter backed by Firestore Admin SDK.
 *
 * The raw limiter subject (email/IP) is never persisted: only a keyed HMAC is
 * used as the document id. `expiresAt` is written for a future Firestore TTL
 * policy; correctness never depends on TTL deletion being immediate.
 */
export async function takeRateLimit(
  key: string,
  maximum: number,
  windowMs = WINDOW_MS,
): Promise<RateLimitResult> {
  const normalizedKey = key.trim()
  if (!normalizedKey || normalizedKey.length > 2_000) {
    throw new AuthSecurityConfigurationError('Rate-limit key is invalid.')
  }
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 10_000) {
    throw new AuthSecurityConfigurationError('Rate-limit maximum is invalid.')
  }
  if (!Number.isInteger(windowMs) || windowMs < 1_000 || windowMs > 24 * 60 * 60 * 1000) {
    throw new AuthSecurityConfigurationError('Rate-limit window is invalid.')
  }

  const db = getFirebaseAdminDb()
  const reference = db
    .collection(RATE_LIMIT_COLLECTION)
    .doc(rateLimitDocumentId(normalizedKey))
  const now = Date.now()

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference)
    const resetAtValue = snapshot.exists ? snapshot.get('resetAt') : null
    const resetAt =
      resetAtValue instanceof Timestamp ? resetAtValue.toMillis() : 0
    const countValue = snapshot.exists ? Number(snapshot.get('count')) : 0
    const count = Number.isFinite(countValue) ? Math.max(0, countValue) : 0

    if (!snapshot.exists || resetAt <= now) {
      const nextResetAt = now + windowMs
      transaction.set(reference, {
        count: 1,
        resetAt: Timestamp.fromMillis(nextResetAt),
        expiresAt: Timestamp.fromMillis(nextResetAt + RETENTION_MS),
        updatedAt: Timestamp.now(),
      })
      return { allowed: true, retryAfterSeconds: 0 }
    }

    if (count >= maximum) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1_000)),
      }
    }

    transaction.update(reference, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(resetAt + RETENTION_MS),
      updatedAt: Timestamp.now(),
    })
    return { allowed: true, retryAfterSeconds: 0 }
  })
}

export function noStoreHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'cache-control': 'no-store, max-age=0',
    pragma: 'no-cache',
    ...extra,
  }
}
