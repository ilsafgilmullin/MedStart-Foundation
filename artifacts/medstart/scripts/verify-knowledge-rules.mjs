import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const firestoreRules = await readFile('../../firestore.secure.rules', 'utf8')
const storageRules = await readFile('../../storage.rules', 'utf8')
const uploadClient = await readFile('lib/knowledge-upload.ts', 'utf8')
const knowledgeClient = await readFile('lib/knowledge-base.ts', 'utf8')
const fileRoute = await readFile('app/api/knowledge/files/route.ts', 'utf8')
const submissionRoute = await readFile(
  'app/api/knowledge/submissions/route.ts',
  'utf8',
)
const moderationRoute = await readFile(
  'app/api/knowledge/moderation/route.ts',
  'utf8',
)

const knowledgeMatch = firestoreRules.match(
  /match \/knowledgeSubmissions\/\{submissionId\} \{([\s\S]*?)\n    \}/,
)
assert.ok(knowledgeMatch, 'Knowledge Firestore block is missing')
assert.match(knowledgeMatch[1], /allow create: if false;/)
assert.match(knowledgeMatch[1], /allow update, delete: if false;/)
assert.match(knowledgeMatch[1], /resource\.data\.status == 'published'/)
assert.match(knowledgeMatch[1], /resource\.data\.submittedByUid == request\.auth\.uid/)

for (const path of [
  'knowledge-submissions',
  'knowledge-quarantine',
  'knowledge-published',
]) {
  const block = storageRules.match(
    new RegExp(`match \\/${path}\\/[^\\n]+ \\{([\\s\\S]*?)\\n    \\}`),
  )
  assert.ok(block, `${path} Storage block is missing`)
  assert.match(block[1], /allow read, write: if false;/)
}

assert.equal(uploadClient.includes("from 'firebase/storage'"), false)
assert.equal(uploadClient.includes("'/api/knowledge/files'"), true)
assert.equal(knowledgeClient.includes("'/api/knowledge/submissions'"), true)
assert.equal(knowledgeClient.includes("'/api/knowledge/moderation'"), true)
assert.equal(knowledgeClient.includes('updateDoc('), false)
assert.equal(fileRoute.includes('knowledge-quarantine/'), true)
assert.equal(fileRoute.includes('detectUploadType'), true)
assert.equal(submissionRoute.includes('runTransaction'), true)
assert.equal(moderationRoute.includes('requireModerationActor'), true)
assert.equal(moderationRoute.includes('moderationErrorResponse'), true)
assert.equal(moderationRoute.includes('requireAdminActor'), false)
assert.equal(moderationRoute.includes('adminAuditLogs'), true)
assert.equal(moderationRoute.includes('knowledge-published/'), true)

console.log('Knowledge-base server-only verification passed.')