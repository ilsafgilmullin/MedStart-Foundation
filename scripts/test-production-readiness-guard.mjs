import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workflow = await readFile(
  '.github/workflows/production-readiness-audit.yml',
  'utf8',
)
const script = await readFile(
  'artifacts/medstart/scripts/audit-production-readiness.mjs',
  'utf8',
)

assert.equal(workflow.includes('\n  push:'), false)
assert.equal(workflow.includes('workflow_dispatch:'), true)
assert.equal(workflow.includes('READ_ONLY_PRODUCTION_AUDIT'), true)
assert.equal(
  workflow.includes(
    "github.ref == 'refs/heads/main' && inputs.confirmation == 'READ_ONLY_PRODUCTION_AUDIT'",
  ),
  true,
)
assert.equal(workflow.includes('environment: production'), true)
assert.equal(workflow.includes('permissions:\n  contents: read'), true)
assert.equal(workflow.includes('MEDSTART_AUDIT_PROJECT_ID: medstart-e9bfe'), true)
assert.equal(
  workflow.includes('MEDSTART_EXPECTED_FIREBASE_PROJECT_ID: medstart-e9bfe'),
  true,
)
assert.equal(
  workflow.includes('FIREBASE_READ_ONLY_SERVICE_ACCOUNT_JSON'),
  true,
)
assert.equal(workflow.includes('FIREBASE_SERVICE_ACCOUNT_JSON'), false)

// The report hashes document IDs before writing its local JSON artifact. Remove
// that known-safe crypto method from the static mutation scan so `.update()` on
// the hash object cannot be mistaken for a Firestore DocumentReference update.
const mutationScanSource = script.replace(
  /createHash\([^\n]+\)\.update\([^\n]+\)\.digest\([^\n]+\)/g,
  '',
)

for (const forbidden of [
  '.set(',
  '.update(',
  '.delete(',
  '.create(',
  'runTransaction(',
  '.batch(',
  '.bulkWriter(',
  'deleteUser(',
  'updateUser(',
  'createUser(',
  'setCustomUserClaims(',
  'revokeRefreshTokens(',
  "from 'firebase-admin/storage'",
]) {
  assert.equal(
    mutationScanSource.includes(forbidden),
    false,
    `read-only production audit contains forbidden mutation marker: ${forbidden}`,
  )
}

for (const marker of [
  'owner_auth_not_ready',
  'school_students_exist_while_scope_disabled',
  'school_only_tutors_exist_while_scope_disabled',
  'non_active_public_tutors_exist',
  'active_booking_intervals_not_normalized',
  'legacy_published_pdf_requires_revalidation',
  'stale_admin_operations_require_review',
]) {
  assert.equal(script.includes(marker), true, `missing readiness check: ${marker}`)
}

assert.equal(script.includes("mode: 'read-only'"), true)
assert.equal(script.includes("process.exitCode = 2"), true)

console.log('Production readiness workflow is guarded, main-only and read-only.')
