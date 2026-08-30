import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const envExample = await readFile('.env.example', 'utf8')
const firebaseClient = await readFile('artifacts/medstart/lib/firebase.ts', 'utf8')
const authClient = await readFile('artifacts/medstart/lib/auth.ts', 'utf8')
const serverGuard = await readFile(
  'artifacts/medstart/lib/server/app-check.ts',
  'utf8',
)
const firebaseAdmin = await readFile(
  'artifacts/medstart/lib/server/firebase-admin.ts',
  'utf8',
)
const firebaseIdentity = await readFile(
  'artifacts/medstart/lib/server/firebase-identity.ts',
  'utf8',
)

const routes = await Promise.all(
  [
    'artifacts/medstart/app/api/auth/login/route.ts',
    'artifacts/medstart/app/api/auth/register/route.ts',
    'artifacts/medstart/app/api/auth/password-reset/route.ts',
  ].map((path) => readFile(path, 'utf8')),
)

assert.equal(
  envExample.includes('NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY='),
  true,
)
assert.equal(
  envExample.includes('MEDSTART_APP_CHECK_ENFORCEMENT_ENABLED=false'),
  true,
)

for (const marker of [
  "from 'firebase/app-check'",
  'initializeAppCheck',
  'ReCaptchaEnterpriseProvider',
  '__medstartAppCheck',
  'isTokenAutoRefreshEnabled: true',
]) {
  assert.equal(firebaseClient.includes(marker), true, `missing client marker: ${marker}`)
}
assert.equal(
  firebaseClient.indexOf('export const appCheck = createAppCheck()') <
    firebaseClient.indexOf('export const auth = createAuth()'),
  true,
)
assert.equal(
  firebaseClient.indexOf('export const appCheck = createAppCheck()') <
    firebaseClient.indexOf('export const db = createFirestore()'),
  true,
)

assert.equal(authClient.includes("import { getToken } from 'firebase/app-check'"), true)
assert.equal(authClient.includes("'X-Firebase-AppCheck': result.token"), true)
assert.equal(authClient.includes("'APP_CHECK_REQUIRED'"), true)

assert.equal(serverGuard.includes('MEDSTART_APP_CHECK_ENFORCEMENT_ENABLED'), true)
assert.equal(serverGuard.includes('x-firebase-appcheck'), true)
assert.equal(serverGuard.includes('.verifyToken(token)'), true)
assert.equal(serverGuard.includes('MAX_APP_CHECK_TOKEN_LENGTH'), true)

assert.equal(firebaseAdmin.includes("from 'firebase-admin/app-check'"), true)
assert.equal(firebaseAdmin.includes('getFirebaseAdminAppCheck'), true)
assert.equal(firebaseIdentity.includes("headers['x-firebase-appcheck']"), true)

for (const [index, route] of routes.entries()) {
  assert.equal(
    route.includes('appCheckTokenForRequest(request)'),
    true,
    `auth route ${index + 1} does not verify/forward App Check`,
  )
  assert.equal(
    route.includes("code: 'APP_CHECK_REQUIRED'"),
    true,
    `auth route ${index + 1} does not expose a stable App Check error`,
  )
  assert.equal(
    route.includes('appCheckToken'),
    true,
    `auth route ${index + 1} does not retain the attestation token`,
  )
}

console.log('Firebase App Check client, auth API and Identity Toolkit contract passed.')
