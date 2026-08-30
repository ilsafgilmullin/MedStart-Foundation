import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const sourceRoot = join(root, 'artifacts', 'medstart')
const thirdPartyVendorRoot = join(sourceRoot, 'public', 'vendor')
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.yml', '.yaml', '.rules'])
const forbiddenPatterns = [
  ['TODO', /\bTODO\b/],
  ['FIXME', /\bFIXME\b/],
  ['TypeScript suppression', /@ts-ignore|@ts-nocheck/],
  ['dangerous HTML injection', /dangerouslySetInnerHTML/],
  ['dynamic code evaluation', /\beval\s*\(/],
  ['nested interactive role workaround', /role=["']button["']/],
]

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory() && path === thirdPartyVendorRoot) continue
    if (entry.isDirectory()) files.push(...(await collectFiles(path)))
    else files.push(path)
  }
  return files
}

const files = await collectFiles(sourceRoot)
const failures = []
for (const path of files) {
  const extension = path.slice(path.lastIndexOf('.'))
  if (!textExtensions.has(extension)) continue
  const text = await readFile(path, 'utf8')
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(text)) failures.push(`${label}: ${path.slice(root.length + 1)}`)
  }
}

const requiredFiles = [
  'firestore.secure.rules',
  'storage.rules',
  'scripts/test-critical-rules.mjs',
  'scripts/test-medium-rules.mjs',
  'scripts/test-auth-rules.mjs',
  'scripts/full-repository-audit.mjs',
  'artifacts/medstart/scripts/live-auth-audit.mjs',
  'artifacts/medstart/lib/firebase-public-config.ts',
  'artifacts/medstart/lib/server/firebase-admin.ts',
  'artifacts/medstart/lib/server/firebase-identity.ts',
  'artifacts/medstart/lib/server/auth-security.ts',
  'artifacts/medstart/lib/feature-flags.ts',
  'artifacts/medstart/lib/server/feature-flags.ts',
  'artifacts/medstart/hooks/useHydrated.ts',
  'artifacts/medstart/app/api/auth/login/route.ts',
  'artifacts/medstart/app/api/auth/register/route.ts',
  'artifacts/medstart/app/api/auth/password-reset/route.ts',
  'artifacts/medstart/app/api/health/auth/route.ts',
  'artifacts/medstart/app/api/admin/overview/route.ts',
  'artifacts/medstart/app/api/admin/action/route.ts',
  'artifacts/medstart/app/api/knowledge/files/route.ts',
  'artifacts/medstart/app/api/knowledge/submissions/route.ts',
  'artifacts/medstart/app/api/knowledge/moderation/route.ts',
  'artifacts/medstart/lib/server/knowledge-access.ts',
  'artifacts/medstart/lib/server/knowledge-security.ts',
  'artifacts/medstart/lib/server/malware-scanner.ts',
  'artifacts/medstart/lib/admin-control.ts',
  'artifacts/medstart/lib/server/admin-control.ts',
  'artifacts/medstart/components/auth/AuthHealthBanner.tsx',
  'artifacts/medstart/components/auth/AuthShell.tsx',
  'artifacts/medstart/components/auth/PasswordField.tsx',
  'artifacts/medstart/components/auth/PasswordRequirements.tsx',
]
for (const relativePath of requiredFiles) {
  await readFile(join(root, relativePath), 'utf8').catch(() => {
    failures.push(`Missing required file: ${relativePath}`)
  })
}

const gitignore = await readFile(join(root, '.gitignore'), 'utf8')
if (!gitignore.includes('.medstart-backups/')) failures.push('Missing .medstart-backups/ in .gitignore')

const firebase = JSON.parse(await readFile(join(root, 'firebase.json'), 'utf8'))
if (firebase.firestore?.rules !== 'firestore.secure.rules') {
  failures.push('firebase.json does not use firestore.secure.rules')
}

const authSource = await readFile(join(sourceRoot, 'lib', 'auth.ts'), 'utf8')
const firebaseSource = await readFile(join(sourceRoot, 'lib', 'firebase.ts'), 'utf8')
const firebaseConfigSource = await readFile(join(sourceRoot, 'lib', 'firebase-public-config.ts'), 'utf8')
const adminSource = await readFile(join(sourceRoot, 'lib', 'server', 'firebase-admin.ts'), 'utf8')
const identitySource = await readFile(join(sourceRoot, 'lib', 'server', 'firebase-identity.ts'), 'utf8')
const authProviderSource = await readFile(join(sourceRoot, 'providers', 'AuthProvider.tsx'), 'utf8')
const loginRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'auth', 'login', 'route.ts'), 'utf8')
const registerRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'auth', 'register', 'route.ts'), 'utf8')
const resetRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'auth', 'password-reset', 'route.ts'), 'utf8')
const healthRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'health', 'auth', 'route.ts'), 'utf8')
const adminOverviewRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'admin', 'overview', 'route.ts'), 'utf8')
const adminActionRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'admin', 'action', 'route.ts'), 'utf8')
const adminServerSource = await readFile(join(sourceRoot, 'lib', 'server', 'admin-control.ts'), 'utf8')
const nextConfigSource = await readFile(join(sourceRoot, 'next.config.ts'), 'utf8')
const middlewareSource = await readFile(join(sourceRoot, 'middleware.ts'), 'utf8')
const serviceWorkerSource = await readFile(join(sourceRoot, 'public', 'sw.js'), 'utf8')
const authShellSource = await readFile(join(sourceRoot, 'components', 'auth', 'AuthShell.tsx'), 'utf8')
const loginPageSource = await readFile(join(sourceRoot, 'app', 'login', 'page.tsx'), 'utf8')
const studentPageSource = await readFile(join(sourceRoot, 'app', 'register', 'student', 'page.tsx'), 'utf8')
const tutorPageSource = await readFile(join(sourceRoot, 'app', 'register', 'tutor', 'page.tsx'), 'utf8')
const forgotPasswordSource = await readFile(join(sourceRoot, 'app', 'forgot-password', 'page.tsx'), 'utf8')
const loginHookSource = await readFile(join(sourceRoot, 'hooks', 'useLogin.ts'), 'utf8')
const studentRegistrationSource = await readFile(join(sourceRoot, 'hooks', 'useStudentRegistration.ts'), 'utf8')
const tutorRegistrationSource = await readFile(join(sourceRoot, 'hooks', 'useTutorRegistration.ts'), 'utf8')

if (!authSource.includes("authRequest('/api/auth/login'")) failures.push('Login bypasses the MedStart server')
if (!authSource.includes("authRequest('/api/auth/register'")) failures.push('Registration bypasses the MedStart server')
if (!authSource.includes('signInWithCustomToken')) failures.push('Server login cannot establish a Firebase client session')
if (authSource.includes('signInWithEmailAndPassword')) failures.push('Client still sends login passwords directly to Firebase')
if (authSource.includes('createUserWithEmailAndPassword')) failures.push('Client still creates Firebase users directly')
if (!authSource.includes('runAuthTransition')) failures.push('Authentication transitions are not serialized')
if (!authSource.includes('getIdToken(true)')) failures.push('Login does not refresh the verified ID token')

if (!firebaseSource.includes('firebasePublicConfig')) failures.push('Firebase client bypasses the shared public configuration')
if (!firebaseConfigSource.includes('configuredValues > 0 && configuredValues < 6')) failures.push('Partial Firebase public configuration is not rejected')
if (!adminSource.includes('FirebaseAdminConfigurationError')) failures.push('Firebase Admin configuration failures are not explicit')
if (!adminSource.includes('validateProjectId')) failures.push('Firebase Admin project mismatch is not rejected')
if (!adminSource.includes("ADMIN_APP_NAME = 'medstart-server-admin'")) failures.push('Firebase Admin does not use an isolated named app')

for (const persistence of ['indexedDBLocalPersistence', 'browserLocalPersistence', 'browserSessionPersistence', 'inMemoryPersistence']) {
  if (!firebaseSource.includes(persistence)) failures.push(`Firebase Auth persistence fallback is missing: ${persistence}`)
}
if (!authProviderSource.includes('isAuthTransitionInProgress()')) failures.push('AuthProvider can interrupt authentication transitions')
if (!authProviderSource.includes('onIdTokenChanged')) failures.push('AuthProvider cannot reconcile token refreshes')

for (const marker of ['identitytoolkit.googleapis.com', 'AbortSignal.timeout', 'x-firebase-locale']) {
  if (!identitySource.includes(marker)) failures.push(`Shared Firebase Identity client is missing: ${marker}`)
}
for (const marker of ['firebaseIdentityRequest', 'createCustomToken', 'EMAIL_NOT_VERIFIED', "profile.status === 'blocked'", 'takeRateLimit', 'AUTH_CONFIGURATION_ERROR']) {
  if (!loginRouteSource.includes(marker)) failures.push(`Login route is missing: ${marker}`)
}
for (const marker of ['firebaseIdentityRequest', 'createUser', 'runTransaction', 'deleteUser', "requestType: 'VERIFY_EMAIL'", 'takeRateLimit', 'AUTH_CONFIGURATION_ERROR']) {
  if (!registerRouteSource.includes(marker)) failures.push(`Registration route is missing: ${marker}`)
}
for (const marker of ['firebaseIdentityRequest', "requestType: 'PASSWORD_RESET'", 'EMAIL_NOT_FOUND', 'takeRateLimit']) {
  if (!resetRouteSource.includes(marker)) failures.push(`Password reset route is missing: ${marker}`)
}
for (const marker of ['FirebaseAdminConfigurationError', 'ownerAccount', 'ownerProfile', 'withTimeout']) {
  if (!healthRouteSource.includes(marker)) failures.push(`Authentication health route is missing: ${marker}`)
}

for (const marker of ['requireAdminActor', 'listAllAuthUsers', 'adminAuditLogs', 'ownerProtected']) {
  if (!adminOverviewRouteSource.includes(marker)) failures.push(`Admin overview route is missing: ${marker}`)
}
for (const marker of [
  'requireOwner',
  'assertTargetIsNotOwner',
  'buildAdminAuditData',
  'startAdminAudit',
  'completeAdminAudit',
  'failAdminAudit',
  'revokeRefreshTokens',
  'set_booking_status',
]) {
  if (!adminActionRouteSource.includes(marker)) failures.push(`Admin action route is missing: ${marker}`)
}
for (const marker of [
  'verifyIdToken(token, true)',
  'PRIMARY_OWNER_UID',
  'adminAuditLogs',
  'operationStatus',
  'startAdminAudit',
  'completeAdminAudit',
  'failAdminAudit',
]) {
  if (!adminServerSource.includes(marker)) failures.push(`Admin server guard is missing: ${marker}`)
}
if (!adminServerSource.includes("operationStatus === 'started' ? null")) {
  failures.push('Admin audit intent does not preserve an explicit incomplete state')
}
if (!adminActionRouteSource.includes("operationStatus: 'succeeded'")) {
  failures.push('Admin Auth/Firestore compound actions do not atomically finalize their audit record')
}

if (!middlewareSource.includes("...(!isProduction ? [\"'unsafe-inline'\", \"'unsafe-eval'\"] : [])")) failures.push('Development nonce CSP can block Next.js hydration')
if (!middlewareSource.includes("`'nonce-${nonce}'`")) failures.push('Production CSP is missing a per-request script nonce')
if (nextConfigSource.includes('Content-Security-Policy')) failures.push('Static CSP competes with per-request nonce CSP')
if (!serviceWorkerSource.includes("CACHE_NAME = 'medstart-shell-v5'")) failures.push('Service worker cache version was not advanced')
if (!serviceWorkerSource.includes('networkFirst(request)')) failures.push('Next.js static assets can remain stale in the service worker')
if (!authShellSource.includes('AuthHealthBanner')) failures.push('Authentication screens do not display dependency health')

for (const [label, source] of [
  ['login page', loginPageSource],
  ['student registration page', studentPageSource],
  ['tutor registration page', tutorPageSource],
  ['password reset page', forgotPasswordSource],
]) {
  if (!source.includes('useHydrated')) failures.push(`${label} can submit before React hydration`)
}

if (!studentRegistrationSource.includes('isStrongPassword')) failures.push('Student registration does not enforce password policy')
if (!tutorRegistrationSource.includes('isStrongPassword')) failures.push('Tutor registration does not enforce password policy')
if (!studentRegistrationSource.includes('result.verificationSent')) failures.push('Student registration loses verification delivery status')
if (!tutorRegistrationSource.includes('result.verificationSent')) failures.push('Tutor registration loses verification delivery status')

for (const [label, source] of [
  ['login', loginHookSource],
  ['student registration', studentRegistrationSource],
  ['tutor registration', tutorRegistrationSource],
]) {
  if (!source.includes('window.location.replace')) failures.push(`${label} does not use deterministic post-auth navigation`)
  if (source.includes('router.refresh()')) failures.push(`${label} can race navigation with router.refresh()`)
  if (!source.includes('navigationStarted')) failures.push(`${label} can re-enable its form while navigation is starting`)
  if (!source.includes('AUTH_CONFIGURATION_ERROR')) failures.push(`${label} hides Firebase Admin configuration failures`)
}

if (failures.length) throw new Error(`Final audit invariants failed:\n${failures.join('\n')}`)
console.log(`Final audit invariants passed for ${files.length} application files.`)
