import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workflow = await readFile(
  '.github/workflows/auth-live-audit.yml',
  'utf8',
)
const auditScript = await readFile(
  'artifacts/medstart/scripts/live-auth-audit.mjs',
  'utf8',
)

assert.equal(workflow.includes('pull_request:'), false)
assert.equal(workflow.includes('workflow_dispatch:'), true)
assert.equal(workflow.includes('DEPLOY_FIRESTORE_RULES'), true)
assert.equal(
  workflow.includes("inputs.confirmation == 'DEPLOY_FIRESTORE_RULES'"),
  true,
)
assert.equal(
  workflow.includes('MEDSTART_ALLOW_RULES_DEPLOY: CONFIRMED'),
  true,
)
assert.equal(
  auditScript.includes(
    "process.env.MEDSTART_ALLOW_RULES_DEPLOY !== 'CONFIRMED'",
  ),
  true,
)
assert.equal(
  auditScript.includes(
    'Live audit refused to deploy Firestore Rules without explicit confirmation.',
  ),
  true,
)

console.log('Firebase live audit deployment guard tests passed.')
