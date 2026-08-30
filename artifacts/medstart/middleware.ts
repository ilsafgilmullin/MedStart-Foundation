import { NextResponse, type NextRequest } from 'next/server'

const isProduction = process.env.NODE_ENV === 'production'

function configuredOrigin(value: string | undefined) {
  if (!value?.trim()) return null
  try {
    return new URL(value.trim()).origin
  } catch {
    return null
  }
}

function contentSecurityPolicy(nonce: string) {
  const liveKitOrigin = configuredOrigin(process.env.LIVEKIT_URL)
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(!isProduction ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
  ].join(' ')
  const connectSources = [
    "'self'",
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://firestore.googleapis.com',
    'https://firebasestorage.googleapis.com',
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://*.firebaseapp.com',
    'https://*.firebasestorage.app',
    'https://*.livekit.cloud',
    'wss://*.livekit.cloud',
    ...(liveKitOrigin ? [liveKitOrigin] : []),
    ...(!isProduction ? ['ws:', 'wss:'] : []),
  ].join(' ')

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.firebasestorage.app",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src ${connectSources}`,
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '')
  const csp = contentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
