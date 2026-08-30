import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const securitySource = await readFile(
  'artifacts/medstart/lib/server/knowledge-security.ts',
  'utf8',
)
const accessSource = await readFile(
  'artifacts/medstart/lib/server/knowledge-access.ts',
  'utf8',
)
const uploadClient = await readFile(
  'artifacts/medstart/lib/knowledge-upload.ts',
  'utf8',
)
const knowledgeClient = await readFile(
  'artifacts/medstart/lib/knowledge-base.ts',
  'utf8',
)
const fileRoute = await readFile(
  'artifacts/medstart/app/api/knowledge/files/route.ts',
  'utf8',
)
const submissionRoute = await readFile(
  'artifacts/medstart/app/api/knowledge/submissions/route.ts',
  'utf8',
)
const moderationRoute = await readFile(
  'artifacts/medstart/app/api/knowledge/moderation/route.ts',
  'utf8',
)
const firestoreRules = await readFile('firestore.secure.rules', 'utf8')
const storageRules = await readFile('storage.rules', 'utf8')
const workspaceConfig = await readFile('pnpm-workspace.yaml', 'utf8')
const lockfile = await readFile('pnpm-lock.yaml', 'utf8')

for (const marker of [
  "MAX_KNOWLEDGE_PDF_SIZE = 25 * 1024 * 1024",
  "KNOWLEDGE_SIGNATURE_BYTES = 512",
  "/^[A-Za-z0-9_-]{8,160}$/",
  "parsed.protocol !== 'https:'",
  "knowledge-quarantine\\/([^/]+)\\/([^/]+)\\/([^/]+)",
  "knowledge-published\\/([^/]+)\\/([^/]+)",
  "knowledge-submissions\\/([^/]+)\\/([^/]+)\\/([^/]+)",
  "input.rightsConfirmed !== true",
  "input.medicalConfirmed !== true",
  "input.noPatientDataConfirmed !== true",
]) {
  assert.equal(
    securitySource.includes(marker),
    true,
    `Missing knowledge security marker: ${marker}`,
  )
}

for (const marker of [
  'verifyIdToken(token, true)',
  'decoded.email_verified',
  "profile.status !== 'active'",
  "role === 'owner' || role === 'admin'",
  'requireTutor',
]) {
  assert.equal(
    accessSource.includes(marker),
    true,
    `Missing knowledge access marker: ${marker}`,
  )
}

assert.equal(uploadClient.includes("from 'firebase/storage'"), false)
assert.equal(uploadClient.includes("'/api/knowledge/files'"), true)
assert.equal(knowledgeClient.includes('updateDoc('), false)
assert.equal(knowledgeClient.includes("'/api/knowledge/submissions'"), true)
assert.equal(knowledgeClient.includes("'/api/knowledge/moderation'"), true)

for (const marker of [
  'knowledge-quarantine/',
  'detectUploadType',
  "securityStatus: 'signature-verified'",
  "malwareScanStatus: 'clean'",
  "storageState: 'quarantined'",
  "validation: 'crc32c'",
  "createHash('sha256')",
  "collection('knowledgeSubmissions')",
  'KNOWLEDGE_SUBMISSION_ALREADY_EXISTS',
  'submissionAfterUpload',
  'orphanDeleted: true',
  'await takeRateLimit',
  'knowledge-upload:account:',
  'KNOWLEDGE_UPLOAD_WINDOW_MS',
  'KNOWLEDGE_UPLOAD_RATE_LIMIT',
  'KNOWLEDGE_UPLOAD_SECURITY_UNAVAILABLE',
]) {
  assert.equal(fileRoute.includes(marker), true, `Missing upload marker: ${marker}`)
}
assert.equal(
  fileRoute.includes('new Map<'),
  false,
  'Knowledge uploads must not use a process-local rate limiter.',
)

for (const marker of [
  'runTransaction',
  "storageState = 'quarantined'",
  "collection('knowledgeSubmissions')",
  'KNOWLEDGE_QUARANTINE_METADATA_REJECTED',
  'cleanupQuarantineSiblings',
  'orphanFilesRemoved',
  'orphanCleanupRequired',
]) {
  assert.equal(
    submissionRoute.includes(marker),
    true,
    `Missing submission marker: ${marker}`,
  )
}

for (const marker of [
  'requireModerationActor',
  'moderationErrorResponse',
  'knowledge-published/',
  'detectUploadType',
  'adminAuditLogs',
  'approve_knowledge_submission',
  'reject_knowledge_submission',
  'runTransaction',
  'moderationLeaseId',
  'moderationLeaseExpiresAt',
  'KNOWLEDGE_MODERATION_IN_PROGRESS',
  'KNOWLEDGE_MODERATION_LEASE_LOST',
  'hashStorageObject(sourcePath)',
  'KNOWLEDGE_FILE_HASH_MISMATCH',
  'FieldValue.delete()',
  'moderationFinalized',
]) {
  assert.equal(
    moderationRoute.includes(marker),
    true,
    `Missing moderation marker: ${marker}`,
  )
}

assert.equal(
  moderationRoute.includes('requireAdminActor'),
  false,
  'Knowledge moderation must use the isolated moderation guard, not broad admin access.',
)
assert.equal(
  moderationRoute.includes(
    "let sha256 = String(data.sha256 || custom.sha256 || '')",
  ),
  false,
  'Moderation must not trust a stored SHA without re-hashing the object.',
)
assert.equal(
  moderationRoute.includes(
    'knowledge-published/${submissionId}/${parsed.fileName}',
  ),
  false,
  'Published paths must be unique per moderation attempt.',
)
assert.equal(
  (moderationRoute.match(/runTransaction/g) || []).length >= 3,
  true,
  'Moderation requires claim, finalize, and lease-release transactions.',
)

const knowledgeRuleBlock = firestoreRules.match(
  /match \/knowledgeSubmissions\/\{submissionId\} \{([\s\S]*?)\n\s*\}/,
)
assert.ok(knowledgeRuleBlock, 'Knowledge Firestore block is missing')
assert.match(knowledgeRuleBlock[1], /allow create: if false;/)
assert.match(knowledgeRuleBlock[1], /allow update, delete: if false;/)

for (const path of [
  'knowledge-submissions',
  'knowledge-quarantine',
  'knowledge-published',
]) {
  assert.equal(storageRules.includes(`match /${path}/`), true)
}
assert.equal(
  (storageRules.match(/allow read, write: if false;/g) || []).length >= 4,
  true,
)

assert.equal(
  workspaceConfig.includes('nanoid@<3.3.18: 3.3.18'),
  true,
  'Workspace must pin Nano ID to the patched 3.x release.',
)
assert.equal(
  lockfile.includes('nanoid@3.3.18'),
  true,
  'Lockfile must contain Nano ID 3.3.18.',
)
assert.equal(
  lockfile.includes('nanoid@3.3.16'),
  false,
  'Vulnerable Nano ID 3.3.16 must not remain in the lockfile.',
)

console.log('Knowledge submission pipeline contract tests passed.')