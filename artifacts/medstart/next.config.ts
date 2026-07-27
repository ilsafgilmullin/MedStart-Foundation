import type { NextConfig } from 'next'

const isProduction = process.env.NODE_ENV === 'production'

function configuredOrigin(value: string | undefined) {
  if (!value?.trim()) return null
  try {
    return new URL(value.trim()).origin
  } catch {
    throw new Error('LIVEKIT_URL must be a valid absolute URL.')
  }
}

const liveKitOrigin = configuredOrigin(process.env.LIVEKIT_URL)
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(!isProduction ? ["'unsafe-eval'"] : []),
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
const contentSecurityPolicy = [
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

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ['*.replit.dev', '*.repl.co', '*.replit.app'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@livekit/components-react',
      'livekit-client',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/medstart-mark.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
}

export default nextConfig
