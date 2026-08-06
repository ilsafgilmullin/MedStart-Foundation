import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  canonicalKnowledgePdfName,
  normalizeKnowledgeSubmissionInput,
  parseKnowledgeStoragePath,
  validateKnowledgeHttpsUrl,
  validateKnowledgeSubmissionId,
} from '../artifacts/medstart/lib/server/knowledge-security.ts'

const validId = 'AbCdEf1234567890_-'
assert.equal(validateKnowledgeSubmissionId(validId), validId)
assert.throws(() => validateKnowledgeSubmissionId('../bad'))
assert.throws(() => validateKnowledgeSubmissionId('short'))

assert.equal(
  validateKnowledgeHttpsUrl('https://example.org/library/material.pdf'),
  'https://example.org/library/material.pdf',
)
assert.equal(
  validateKnowledgeHttpsUrl('https://user:secret@example.org/material'),
  'https://example.org/material',
)
assert.throws(() => validateKnowledgeHttpsUrl('http://example.org/material'))
assert.throws(() => validateKnowledgeHttpsUrl('javascript:alert(1)'))

assert.equal(canonicalKnowledgePdfName('../patient record.exe'), '..-patient record.pdf')
assert.equal(canonicalKnowledgePdfName('report.PDF'), 'report.pdf')
assert.equal(canonicalKnowledgePdfName('...'), 'material.pdf')

assert.deepEqual(
  parseKnowledgeStoragePath(
    `knowledge-quarantine/tutor-1/${validId}/safe.pdf`,
  ),
  {
    kind: 'quarantine',
    uploaderUid: 'tutor-1',
    submissionId: validId,
    fileName: 'safe.pdf',
  },
)
assert.equal(
  parseKnowledgeStoragePath(`knowledge-published/${validId}/${validId}.pdf`).kind,
  'published',
)
assert.equal(
  parseKnowledgeStoragePath(
    `knowledge-submissions/tutor-1/${validId}/legacy.pdf`,
  ).kind,
  'legacy',
)
assert.throws(() => parseKnowledgeStoragePath('../outside.pdf'))

const normalized = normalizeKnowledgeSubmissionInput({
  id: validId,
  title: '  Учебный материал  ',
  description:
    'Подробное описание медицинского учебного материала для студентов.',
  kind: 'instruction',
  discipline: 'therapy',
  level: 'university',
  author: 'Автор',
  publicationYear: '2026',
  sourceMode: 'file',
  sourceUrl: 'https://ignored.example',
  filePath: `knowledge-quarantine/tutor-1/${validId}/safe.pdf`,
  rightsConfirmed: true,
  medicalConfirmed: true,
  noPatientDataConfirmed: true,
})
assert.equal(normalized.title, 'Учебный материал')
assert.equal(normalized.sourceUrl, '')
assert.equal(normalized.sourceMode, 'file')
assert.throws(() =>
  normalizeKnowledgeSubmissionInput({
    ...normalized,
    rightsConfirmed: false,
  }),
)
assert.throws(() =>
  normalizeKnowledgeSubmissionInput({
    ...normalized,
    kind: 'executable',
  }),
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

assert.equal(uploadClient.includes("from 'firebase/storage'"), false)
assert.equal(knowledgeClient.includes('updateDoc('), false)
assert.equal(knowledgeClient.includes("'/api/knowledge/submissions'"), true)
assert.equal(knowledgeClient.includes("'/api/knowledge/moderation'"), true)
assert.equal(fileRoute.includes('knowledge-quarantine/'), true)
assert.equal(fileRoute.includes('detectUploadType'), true)
assert.equal(fileRoute.includes("malwareScanStatus: 'not-configured'"), true)
assert.equal(submissionRoute.includes('runTransaction'), true)
assert.equal(submissionRoute.includes("storageState = 'quarantined'"), true)
assert.equal(moderationRoute.includes('requireAdminActor'), true)
assert.equal(moderationRoute.includes('knowledge-published/'), true)
assert.equal(moderationRoute.includes('adminAuditLogs'), true)

console.log('Knowledge submission pipeline tests passed.')
