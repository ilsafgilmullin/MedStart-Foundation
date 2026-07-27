import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const sourceRoot = join(root, 'artifacts', 'medstart')
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
  'artifacts/medstart/scripts/live-auth-audit.mjs',
  'artifacts/medstart/lib/server/firebase-admin.ts',
  'artifacts/medstart/lib/server/auth-security.ts',
  'artifacts/medstart/app/api/auth/login/route.ts',
  'artifacts/medstart/app/api/auth/register/route.ts',
  'artifacts/medstart/app/api/auth/password-reset/route.ts',
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
const authProviderSource = await readFile(join(sourceRoot, 'providers', 'AuthProvider.tsx'), 'utf8')
const loginRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'auth', 'login', 'route.ts'), 'utf8')
const registerRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'auth', 'register', 'route.ts'), 'utf8')
const resetRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'auth', 'password-reset', 'route.ts'), 'utf8')
const loginPageSource = await readFile(join(sourceRoot, 'app', 'login', 'page.tsx'), 'utf8')
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
if (!firebaseSource.includes('initializeAuth')) failures.push('Firebase Auth persistence fallback is missing')
for (const persistence of ['indexedDBLocalPersistence', 'browserLocalPersistence', 'browserSessionPersistence', 'inMemoryPersistence']) {
  if (!firebaseSource.includes(persistence)) failures.push(`Firebase Auth persistence fallback is missing: ${persistence}`)
}
if (!authProviderSource.includes('isAuthTransitionInProgress()')) failures.push('AuthProvider can interrupt authentication transitions')
if (!authProviderSource.includes('onIdTokenChanged')) failures.push('AuthProvider cannot reconcile token refreshes')

for (const marker of ['signInWithPassword', 'createCustomToken', 'EMAIL_NOT_VERIFIED', "profile.status === 'blocked'", 'takeRateLimit']) {
  if (!loginRouteSource.includes(marker)) failures.push(`Login route is missing: ${marker}`)
}
for (const marker of ['createUser', 'runTransaction', 'deleteUser', "requestType: 'VERIFY_EMAIL'", 'takeRateLimit']) {
  if (!registerRouteSource.includes(marker)) failures.push(`Registration route is missing: ${marker}`)
}
for (const marker of ["requestType: 'PASSWORD_RESET'", 'AbortSignal.timeout', 'EMAIL_NOT_FOUND', 'takeRateLimit']) {
  if (!resetRouteSource.includes(marker)) failures.push(`Password reset route is missing: ${marker}`)
}

if (!loginPageSource.includes('AuthShell')) failures.push('Login does not use the MedStart auth design system')
if (!forgotPasswordSource.includes('resetPassword')) failures.push('Password recovery bypasses the shared server client')
if (!studentRegistrationSource.includes('isStrongPassword')) failures.push('Student registration does not enforce password policy')
if (!tutorRegistrationSource.includes('isStrongPassword')) failures.push('Tutor registration does not enforce password policy')
if (!studentRegistrationSource.includes('result.verificationSent')) failures.push('Student registration loses verification delivery status')
if (!tutorRegistrationSource.includes('result.verificationSent')) failures.push('Tutor registration loses verification delivery status')

for (const [label, source] of [
  ['login', loginHookSource],
  ['student registration', studentRegistrationSource],
  ['tutor registration', tutorRegistrationSource],
]) {
  if (!source.includes('window.location.replace')) {
    failures.push(`${label} does not use deterministic post-auth navigation`)
  }
  if (source.includes('router.refresh()')) {
    failures.push(`${label} can race navigation with router.refresh()`)
  }
  if (!source.includes('navigationStarted')) {
    failures.push(`${label} can re-enable its form while navigation is starting`)
  }
}

if (failures.length) throw new Error(`Final audit invariants failed:\n${failures.join('\n')}`)
console.log(`Final audit invariants passed for ${files.length} application files.`)
