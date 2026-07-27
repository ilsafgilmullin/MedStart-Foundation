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
  'artifacts/medstart/app/forgot-password/page.tsx',
  'artifacts/medstart/app/api/auth/password-reset/route.ts',
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
const forgotPasswordSource = await readFile(join(sourceRoot, 'app', 'forgot-password', 'page.tsx'), 'utf8')
const resetRouteSource = await readFile(join(sourceRoot, 'app', 'api', 'auth', 'password-reset', 'route.ts'), 'utf8')
const studentRegistrationSource = await readFile(join(sourceRoot, 'hooks', 'useStudentRegistration.ts'), 'utf8')
const tutorRegistrationSource = await readFile(join(sourceRoot, 'hooks', 'useTutorRegistration.ts'), 'utf8')

if (!authSource.includes('runAuthTransition')) failures.push('Firebase login and registration are not serialized')
if (!authSource.includes('activeAuthTransitions')) failures.push('Firebase auth transition state is missing')
if (!authSource.includes('getIdToken(true)')) failures.push('Verified login does not refresh the Firebase ID token')
if (!authSource.includes('verificationSent: boolean')) failures.push('Registration cannot report verification email delivery state')
if (!authSource.includes('A failed profile write must not leave a login-only orphan account')) failures.push('Registration orphan-account cleanup is missing')
if (!firebaseSource.includes('initializeAuth')) failures.push('Firebase Auth is not initialized with explicit persistence fallback')
for (const persistence of ['indexedDBLocalPersistence', 'browserLocalPersistence', 'browserSessionPersistence', 'inMemoryPersistence']) {
  if (!firebaseSource.includes(persistence)) failures.push(`Firebase Auth persistence fallback is missing: ${persistence}`)
}
if (!authProviderSource.includes('isAuthTransitionInProgress()')) failures.push('AuthProvider can interrupt login or registration transitions')
if (!authProviderSource.includes('if (!currentUser.emailVerified)')) failures.push('AuthProvider does not isolate unverified sessions')
if (!authProviderSource.includes('onIdTokenChanged')) failures.push('AuthProvider cannot reconcile email verification token refreshes')
if (!forgotPasswordSource.includes("fetch('/api/auth/password-reset'")) failures.push('Password recovery bypasses the MedStart server proxy')
if (!forgotPasswordSource.includes('Запрос отправлен')) failures.push('Password recovery does not expose a clear delivery status')
if (!resetRouteSource.includes("requestType: 'PASSWORD_RESET'")) failures.push('Password reset proxy does not call Firebase OOB delivery')
if (!resetRouteSource.includes('AbortSignal.timeout')) failures.push('Password reset proxy has no network timeout')
if (!resetRouteSource.includes('Always return the same response')) failures.push('Password reset proxy can expose registered emails')
if (!studentRegistrationSource.includes('result.verificationSent')) failures.push('Student registration loses verification delivery status')
if (!tutorRegistrationSource.includes('result.verificationSent')) failures.push('Tutor registration loses verification delivery status')

if (failures.length) throw new Error(`Final audit invariants failed:\n${failures.join('\n')}`)
console.log(`Final audit invariants passed for ${files.length} application files.`)
