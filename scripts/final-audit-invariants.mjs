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
]
for (const relativePath of requiredFiles) {
  await readFile(join(root, relativePath), 'utf8').catch(() => {
    failures.push(`Missing required file: ${relativePath}`)
  })
}

const gitignore = await readFile(join(root, '.gitignore'), 'utf8')
if (!gitignore.includes('.medstart-backups/')) {
  failures.push('Missing .medstart-backups/ in .gitignore')
}

const firebase = JSON.parse(await readFile(join(root, 'firebase.json'), 'utf8'))
if (firebase.firestore?.rules !== 'firestore.secure.rules') {
  failures.push('firebase.json does not use firestore.secure.rules')
}

const authSource = await readFile(
  join(sourceRoot, 'lib', 'auth.ts'),
  'utf8',
)
const authProviderSource = await readFile(
  join(sourceRoot, 'providers', 'AuthProvider.tsx'),
  'utf8',
)
if (!authSource.includes('runAuthTransition')) {
  failures.push('Firebase login and registration are not serialized')
}
if (!authSource.includes('activeAuthTransitions')) {
  failures.push('Firebase auth transition state is missing')
}
if (!authProviderSource.includes('isAuthTransitionInProgress()')) {
  failures.push('AuthProvider can interrupt login or registration transitions')
}
if (!authProviderSource.includes('if (!currentUser.emailVerified)')) {
  failures.push('AuthProvider does not isolate unverified sessions')
}

if (failures.length) {
  throw new Error(`Final audit invariants failed:\n${failures.join('\n')}`)
}

console.log(`Final audit invariants passed for ${files.length} application files.`)
