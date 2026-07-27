import 'server-only'

const WINDOW_MS = 15 * 60 * 1000
const attempts = new Map<string, { count: number; resetAt: number }>()

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

export function clientAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

export function takeRateLimit(key: string, maximum: number) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (current.count >= maximum) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  attempts.set(key, current)
  return { allowed: true, retryAfterSeconds: 0 }
}

export function noStoreHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'cache-control': 'no-store, max-age=0',
    pragma: 'no-cache',
    ...extra,
  }
}
