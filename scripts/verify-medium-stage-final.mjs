import { readFile } from 'node:fs/promises'

const requiredPatterns = new Map([
  [
    'firestore.secure.rules',
    [
      'function validNotificationPreferences(data)',
      'function validAvailabilityDay(day)',
      'function validClinicalCase(data)',
      "request.resource.data.createdAt == resource.data.createdAt",
      "duration.value(180, 'd')",
      "request.resource.data.url.matches('https://.+')",
    ],
  ],
  [
    'storage.rules',
    [
      "duration.value(180, 'd')",
      'allow create, update: if false;',
      'request.auth.token.email_verified == true',
    ],
  ],
  [
    'artifacts/medstart/lib/auth.ts',
    ['sendEmailVerification', 'VERIFY_EMAIL_MESSAGE'],
  ],
  [
    'artifacts/medstart/lib/conversations.ts',
    ['limit(MAX_REALTIME_MESSAGES)', "orderBy('createdAt', 'desc')"],
  ],
  [
    'artifacts/medstart/lib/whiteboard.ts',
    ['limit(MAX_REALTIME_ELEMENTS)', "orderBy('createdAtMs', 'asc')"],
  ],
  [
    'artifacts/medstart/components/live/MedicalWorkspace.tsx',
    ['function parseOptionalNumber', 'не является клинической ЭКГ'],
  ],
  [
    'artifacts/medstart/next.config.ts',
    ['Content-Security-Policy', 'Strict-Transport-Security'],
  ],
])

for (const [path, patterns] of requiredPatterns) {
  const text = await readFile(path, 'utf8')
  for (const pattern of patterns) {
    if (!text.includes(pattern)) {
      throw new Error(`${path}: missing medium-stage invariant: ${pattern}`)
    }
  }
}

console.log('Medium-stage static verification passed.')
