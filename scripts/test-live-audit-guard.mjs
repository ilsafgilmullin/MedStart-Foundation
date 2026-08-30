import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const auditWorkflow = await readFile(
  '.github/workflows/auth-live-audit.yml',
  'utf8',
)
const deployWorkflow = await readFile(
  '.github/workflows/firebase-deploy.yml',
  'utf8',
)
const auditScript = await readFile(
  'artifacts/medstart/scripts/live-auth-audit.mjs',
  'utf8',
)
const firebasePublicConfig = await readFile(
  'artifacts/medstart/lib/firebase-public-config.ts',
  'utf8',
)
const authSecurity = await readFile(
  'artifacts/medstart/lib/server/auth-security.ts',
  'utf8',
)
const loginRoute = await readFile(
  'artifacts/medstart/app/api/auth/login/route.ts',
  'utf8',
)
const registerRoute = await readFile(
  'artifacts/medstart/app/api/auth/register/route.ts',
  'utf8',
)
const resetRoute = await readFile(
  'artifacts/medstart/app/api/auth/password-reset/route.ts',
  'utf8',
)
const livekitServer = await readFile(
  'artifacts/medstart/lib/server/livekit.ts',
  'utf8',
)
const lessonControls = await readFile(
  'artifacts/medstart/components/live/LessonControls.tsx',
  'utf8',
)
const videoStage = await readFile(
  'artifacts/medstart/components/live/VideoStage.tsx',
  'utf8',
)
const liveLessonRoom = await readFile(
  'artifacts/medstart/components/live/LiveLessonRoom.tsx',
  'utf8',
)
const envExample = await readFile('.env.example', 'utf8')

// Live authentication audit must never run from pull requests or feature refs.
assert.equal(auditWorkflow.includes('pull_request:'), false)
assert.equal(auditWorkflow.includes('workflow_dispatch:'), true)
assert.equal(auditWorkflow.includes('DEPLOY_FIRESTORE_RULES'), true)
assert.equal(
  auditWorkflow.includes(
    "github.ref == 'refs/heads/main' && inputs.confirmation == 'DEPLOY_FIRESTORE_RULES'",
  ),
  true,
)
assert.equal(auditWorkflow.includes('environment: production'), true)
assert.equal(
  auditWorkflow.includes('MEDSTART_ALLOW_RULES_DEPLOY: CONFIRMED'),
  true,
)
assert.equal(
  auditScript.includes(
    "process.env.MEDSTART_ALLOW_RULES_DEPLOY !== 'CONFIRMED'",
  ),
  true,
)
assert.equal(
  auditScript.includes(
    'Live audit refused to deploy Firestore Rules without explicit confirmation.',
  ),
  true,
)

// Production Firebase configuration must be manual-only and main-only.
assert.equal(deployWorkflow.includes('\n  push:'), false)
assert.equal(deployWorkflow.includes('workflow_dispatch:'), true)
assert.equal(deployWorkflow.includes('DEPLOY_FIREBASE_CONFIG'), true)
assert.equal(
  deployWorkflow.includes(
    "github.ref == 'refs/heads/main' && inputs.confirmation == 'DEPLOY_FIREBASE_CONFIG'",
  ),
  true,
)
assert.equal(deployWorkflow.includes('environment: production'), true)
assert.equal(
  deployWorkflow.includes('group: firebase-production-config-deploy'),
  true,
)
assert.equal(deployWorkflow.includes('cancel-in-progress: false'), true)
assert.equal(deployWorkflow.includes('firebase-tools@15.25.1 deploy'), true)
assert.equal(
  deployWorkflow.includes('test "$GITHUB_REF" = "refs/heads/main"'),
  true,
)

// Application builds must never silently fall back to the production project.
assert.equal(firebasePublicConfig.includes('MEDSTART_DEFAULT_CONFIG'), false)
assert.equal(firebasePublicConfig.includes("projectId: 'medstart-e9bfe'"), false)
assert.equal(firebasePublicConfig.includes('configuredValues === 0'), true)
assert.equal(
  firebasePublicConfig.includes(
    'MedStart never falls back to the production Firebase project',
  ),
  true,
)
assert.equal(
  firebasePublicConfig.includes('configuredValues > 0 && configuredValues < 6'),
  true,
)

// Authentication abuse controls must be distributed and privacy-preserving.
assert.equal(authSecurity.includes('new Map<'), false)
assert.equal(authSecurity.includes("createHmac('sha256'"), true)
assert.equal(
  authSecurity.includes("RATE_LIMIT_COLLECTION = 'securityRateLimits'"),
  true,
)
assert.equal(authSecurity.includes('db.runTransaction'), true)
assert.equal(authSecurity.includes('MEDSTART_RATE_LIMIT_PEPPER'), true)
assert.equal(authSecurity.includes('MEDSTART_TRUST_PROXY_HEADERS'), true)
assert.equal(authSecurity.includes('expiresAt: Timestamp.fromMillis'), true)
assert.equal(
  authSecurity.includes('if (!trustedProxyHeadersEnabled()) return null'),
  true,
)
for (const [label, route, accountMarker, networkMarker] of [
  ['login', loginRoute, 'login:account:', 'login:network:'],
  ['registration', registerRoute, 'register:account:', 'register:network:'],
  [
    'password reset',
    resetRoute,
    'password-reset:account:',
    'password-reset:network:',
  ],
]) {
  assert.equal(
    route.includes('await takeRateLimit'),
    true,
    `${label} limiter is not awaited`,
  )
  assert.equal(
    route.includes(accountMarker),
    true,
    `${label} account limiter is missing`,
  )
  assert.equal(
    route.includes('clientAddress(request)'),
    true,
    `${label} proxy guard is missing`,
  )
  assert.equal(
    route.includes(networkMarker),
    true,
    `${label} network limiter is missing`,
  )
}
assert.equal(envExample.includes('MEDSTART_RATE_LIMIT_PEPPER='), true)
assert.equal(envExample.includes('MEDSTART_TRUST_PROXY_HEADERS=false'), true)
assert.equal(envExample.includes('securityRateLimits.expiresAt'), true)

// LiveKit participant attributes are user-mutable. Keep them presentation-only
// and derive trusted participant labels from immutable Firebase UID identities.
assert.equal(livekitServer.includes('identity: input.participantUid'), true)
assert.equal(
  livekitServer.includes("'medstart.handRaised': 'false'"),
  true,
)
assert.equal(livekitServer.includes("'medstart.role'"), false)
assert.equal(livekitServer.includes("'medstart.bookingId'"), false)
assert.equal(livekitServer.includes('metadata: JSON.stringify'), false)
assert.equal(livekitServer.includes('canUpdateOwnMetadata: true'), true)
assert.equal(lessonControls.includes('localParticipant.setAttributes'), true)
assert.equal(lessonControls.includes("'medstart.handRaised'"), true)
assert.equal(videoStage.includes('trustedParticipantName'), true)
assert.equal(videoStage.includes('track.participant.name'), false)
assert.equal(
  liveLessonRoom.includes('<VideoStage booking={booking} />'),
  true,
)

console.log(
  'Firebase deployment, environment isolation, distributed auth and LiveKit identity guard tests passed.',
)
