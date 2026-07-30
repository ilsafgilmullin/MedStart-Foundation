import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const root = process.cwd()
const excludedDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'coverage',
  '.medstart-backups',
])
const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yml', '.yaml',
  '.md', '.rules', '.toml', '.css', '.scss', '.html', '.txt', '.env', '',
])
const generatedOrAuditFiles = new Set([
  'scripts/full-repository-audit.mjs',
  'scripts/final-audit-invariants.mjs',
])

const findings = []
const files = []

function add(severity, code, file, line, message) {
  findings.push({ severity, code, file, line, message })
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(absolute)
      continue
    }
    const info = await stat(absolute)
    files.push({ path: relative(root, absolute), size: info.size })
  }
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length
}

function findAll(text, pattern, callback) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const regex = new RegExp(pattern.source, flags)
  let match
  while ((match = regex.exec(text))) {
    callback(match, lineNumber(text, match.index))
    if (match[0].length === 0) regex.lastIndex += 1
  }
}

function fileSize(path) {
  return files.find((file) => file.path === path)?.size || 0
}

await walk(root)
files.sort((a, b) => a.path.localeCompare(b.path))

const contents = new Map()
for (const file of files) {
  if (file.size > 2_000_000) {
    add('medium', 'OVERSIZED_FILE', file.path, 1, `File is ${file.size} bytes and is difficult to review or deploy.`)
    continue
  }
  const extension = extname(file.path)
  const basename = file.path.split('/').at(-1) || ''
  if (!textExtensions.has(extension) && !basename.startsWith('.env') && basename !== '.replit') continue
  try {
    contents.set(file.path, await readFile(join(root, file.path), 'utf8'))
  } catch {
    add('low', 'UNREADABLE_TEXT_FILE', file.path, 1, 'File could not be read as UTF-8 text.')
  }
}

for (const [path, source] of contents) {
  const isAuditDefinition = generatedOrAuditFiles.has(path)
  const isApplicationSource =
    path.startsWith('artifacts/medstart/') &&
    !path.startsWith('artifacts/medstart/public/vendor/')

  if (!isAuditDefinition) {
    findAll(source, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, (_, line) => {
      add('critical', 'COMMITTED_PRIVATE_KEY', path, line, 'A private key appears to be committed to the repository.')
    })
    findAll(source, /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/g, (_, line) => {
      add('critical', 'COMMITTED_SERVICE_ACCOUNT', path, line, 'A Firebase service-account private key appears in source control.')
    })
  }

  if (isApplicationSource) {
    findAll(source, /(?:@ts-ignore|@ts-nocheck)/g, (_, line) => {
      add('high', 'TYPESCRIPT_SUPPRESSION', path, line, 'TypeScript safety is explicitly disabled.')
    })
    findAll(source, /\b(?:TODO|FIXME|HACK)\b/g, (match, line) => {
      add('low', 'UNFINISHED_MARKER', path, line, `${match[0]} marker remains in application source.`)
    })
    findAll(source, /dangerouslySetInnerHTML/g, (_, line) => {
      add('high', 'RAW_HTML_INJECTION', path, line, 'Raw HTML injection requires an explicit sanitization review.')
    })
    findAll(source, /\beval\s*\(/g, (_, line) => {
      add('high', 'DYNAMIC_EVAL', path, line, 'Dynamic code evaluation is present.')
    })

    if (/['"]use client['"]/.test(source)) {
      if (/signInWithEmailAndPassword|createUserWithEmailAndPassword/.test(source)) {
        add('critical', 'CLIENT_DIRECT_AUTH_PASSWORD', path, 1, 'Client code sends passwords directly to Firebase instead of the MedStart server.')
      }
      if (/firebase-admin/.test(source)) {
        add('critical', 'ADMIN_SDK_IN_CLIENT', path, 1, 'Firebase Admin SDK is imported into a client module.')
      }
    }

    if (/router\.replace\s*\(/.test(source) && /router\.refresh\s*\(/.test(source)) {
      add('high', 'NAVIGATION_REFRESH_RACE', path, 1, 'Route replacement and refresh coexist and can race on mobile Safari.')
    }

    if (/export\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE)/.test(source) && /fetch\s*\(/.test(source)) {
      if (!/AbortSignal\.timeout|AbortController/.test(source)) {
        add('high', 'API_FETCH_WITHOUT_TIMEOUT', path, 1, 'Server route performs an outbound request without a timeout.')
      }
    }

    if (path.endsWith('.tsx') && /<form\b/.test(source) && /onSubmit=/.test(source) && !/action=/.test(source)) {
      const guarded = /useHydrated/.test(source) || /type=["']button["']/.test(source)
      if (!guarded) {
        add('medium', 'FORM_REQUIRES_HYDRATION', path, 1, 'Form has no progressive server fallback or hydration guard.')
      }
    }

    if (fileSize(path) > 120_000) {
      add('medium', 'LARGE_SOURCE_FILE', path, 1, 'Application source file exceeds 120 KB and should be split.')
    }
  }
}

function text(path) {
  return contents.get(path) || ''
}

function requireFile(path, severity = 'critical') {
  if (!files.some((file) => file.path === path)) {
    add(severity, 'MISSING_REQUIRED_FILE', path, 1, 'Required project file is missing.')
  }
}

for (const required of [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.replit',
  '.env.example',
  'firebase.json',
  'firestore.secure.rules',
  'storage.rules',
  'artifacts/medstart/package.json',
  'artifacts/medstart/next.config.ts',
  'artifacts/medstart/lib/server/firebase-admin.ts',
  'artifacts/medstart/app/api/auth/login/route.ts',
  'artifacts/medstart/app/api/auth/register/route.ts',
  'artifacts/medstart/app/api/auth/password-reset/route.ts',
]) requireFile(required)

const replitConfig = text('.replit')
const nextConfig = text('artifacts/medstart/next.config.ts')
const serviceWorker = text('artifacts/medstart/public/sw.js')
const storageRules = text('storage.rules')
const firestoreRules = text('firestore.secure.rules')
const rootPackage = text('package.json')
const appPackage = text('artifacts/medstart/package.json')

if (/pnpm --filter @workspace\/medstart dev/.test(replitConfig)) {
  add('medium', 'REPLIT_RUNS_DEV_SERVER', '.replit', 1, 'Replit Run uses the Next.js development server instead of a production build.')
  if (!/!isProduction[\s\S]*unsafe-eval|unsafe-eval[\s\S]*!isProduction/.test(nextConfig)) {
    add('critical', 'DEV_CSP_BLOCKS_NEXT_HYDRATION', 'artifacts/medstart/next.config.ts', 1, 'Replit runs next dev but CSP does not permit development evaluation; React hydration can fail and forms reload with empty fields.')
  }
}

if (/unsafe-eval/.test(nextConfig) && !/!isProduction/.test(nextConfig)) {
  add('high', 'UNSAFE_EVAL_IN_PRODUCTION', 'artifacts/medstart/next.config.ts', 1, 'unsafe-eval appears enabled without a production guard.')
}
if (/unsafe-inline/.test(nextConfig)) {
  add('medium', 'CSP_UNSAFE_INLINE', 'artifacts/medstart/next.config.ts', 1, 'Production CSP permits inline scripts; move toward nonces or hashes.')
}
if (/connect-src[^\n]*https:\s+wss:/.test(nextConfig)) {
  add('medium', 'CSP_BROAD_CONNECT', 'artifacts/medstart/next.config.ts', 1, 'CSP allows connections to any HTTPS/WSS endpoint instead of an allowlist.')
}

const swRegistrationFiles = [...contents.entries()].filter(([, value]) => /serviceWorker\.(?:register|getRegistration)|navigator\.serviceWorker/.test(value))
if (swRegistrationFiles.length && /\/_next\/static\//.test(serviceWorker) && /cached\s*\|\|\s*fetch|caches\.match\(request\)/.test(serviceWorker)) {
  add('medium', 'SERVICE_WORKER_STALE_JS_RISK', 'artifacts/medstart/public/sw.js', 1, 'Service Worker uses cache-first for Next.js JavaScript; prefer network-first with cache fallback.')
}
for (const [path, value] of swRegistrationFiles) {
  if (!/NODE_ENV|process\.env|production/.test(value)) {
    add('high', 'SERVICE_WORKER_REGISTERED_IN_DEV', path, 1, 'Service Worker registration is not restricted to production.')
  }
}

if (/allow\s+(?:read,\s*)?write\s*:\s*if\s+true/.test(firestoreRules)) {
  add('critical', 'OPEN_FIRESTORE_RULES', 'firestore.secure.rules', 1, 'Firestore contains an unconditional write rule.')
}
if (/allow\s+(?:create|update|delete|write)[^;]*:\s*if\s+true/.test(storageRules)) {
  add('critical', 'OPEN_STORAGE_RULES', 'storage.rules', 1, 'Storage contains an unconditional write rule.')
}
if (!/allow create, update: if false;/.test(storageRules)) {
  add('high', 'STORAGE_UPLOAD_POLICY_UNCLEAR', 'storage.rules', 1, 'Direct client upload denial is not explicit.')
}

if (!/pnpm/.test(rootPackage) || !/--filter @workspace\/medstart/.test(rootPackage)) {
  add('high', 'ROOT_SCRIPT_MISCONFIGURED', 'package.json', 1, 'Root scripts do not consistently target the MedStart workspace.')
}
if (!/"start"\s*:/.test(appPackage)) {
  add('high', 'MISSING_PRODUCTION_START', 'artifacts/medstart/package.json', 1, 'Application package has no production start script.')
}

for (const [path, value] of contents) {
  if (!path.startsWith('artifacts/medstart/')) continue
  if (/process\.env\.[A-Z0-9_]+\s*\|\|\s*['"][^'"]+['"]/.test(value) && /FIREBASE|LIVEKIT|OWNER/.test(value)) {
    add('high', 'PRODUCTION_ENV_FALLBACK', path, 1, 'A production integration variable has a hardcoded fallback, which can silently target the wrong project.')
  }
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.file.localeCompare(b.file) || a.line - b.line)

const summary = Object.fromEntries(['critical', 'high', 'medium', 'low'].map((severity) => [severity, findings.filter((item) => item.severity === severity).length]))
const report = {
  generatedAt: new Date().toISOString(),
  fileCount: files.length,
  textFileCount: contents.size,
  summary,
  findings,
  files,
}

await writeFile('full-repository-audit.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8')
const markdown = [
  '# MedStart full repository audit',
  '',
  `Scanned files: ${files.length}`,
  `Text files inspected: ${contents.size}`,
  `Critical: ${summary.critical}; high: ${summary.high}; medium: ${summary.medium}; low: ${summary.low}`,
  '',
  ...findings.map((item) => `- **${item.severity.toUpperCase()} ${item.code}** — \`${item.file}:${item.line}\`: ${item.message}`),
  '',
].join('\n')
await writeFile('full-repository-audit.md', markdown, 'utf8')

console.log(markdown)
if (summary.critical > 0) process.exitCode = 2
else if (summary.high > 0) process.exitCode = 1
