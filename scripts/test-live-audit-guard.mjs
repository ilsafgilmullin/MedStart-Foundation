import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const auditWorkflow = await readFile(
  '.github/workflows/auth-live-audit.yml',
  'utf8',
)
const deployWorkflow = await readFile(
  '.github/workflows/firebase-deploy.yml',
  'utf8',
)
const auditScript = await readFile(
  'artifacts/medstart/scripts/live-auth-audit.mjs',
  'utf8',
)

// Live authentication audit must never run from pull requests or feature refs.
assert.equal(auditWorkflow.includes('pull_request:'), false)
assert.equal(auditWorkflow.includes('workflow_dispatch:'), true)
assert.equal(auditWorkflow.includes('DEPLOY_FIRESTORE_RULES'), true)
assert.equal(
  auditWorkflow.includes(
    "github.ref == 'refs/heads/main' && inputs.confirmation == 'DEPLOY_FIRESTORE_RULES'",
  ),
  true,
)
assert.equal(auditWorkflow.includes('environment: production'), true)
assert.equal(
  auditWorkflow.includes('MEDSTART_ALLOW_RULES_DEPLOY: CONFIRMED'),
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

// Production Firebase configuration must be manual-only and main-only.
assert.equal(deployWorkflow.includes('\n  push:'), false)
assert.equal(deployWorkflow.includes('workflow_dispatch:'), true)
assert.equal(deployWorkflow.includes('DEPLOY_FIREBASE_CONFIG'), true)
assert.equal(
  deployWorkflow.includes(
    "github.ref == 'refs/heads/main' && inputs.confirmation == 'DEPLOY_FIREBASE_CONFIG'",
  ),
  true,
)
assert.equal(deployWorkflow.includes('environment: production'), true)
assert.equal(
  deployWorkflow.includes('group: firebase-production-config-deploy'),
  true,
)
assert.equal(deployWorkflow.includes('cancel-in-progress: false'), true)
assert.equal(deployWorkflow.includes('firebase-tools@15.25.1 deploy'), true)
assert.equal(
  deployWorkflow.includes('test "$GITHUB_REF" = "refs/heads/main"'),
  true,
)

console.log('Firebase production deployment guard tests passed.')
