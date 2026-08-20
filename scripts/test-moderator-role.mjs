import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')

const [
  profileSource,
  navigationSource,
  moderatorServerSource,
  moderatorOverviewSource,
  moderatorTutorSource,
  adminServerSource,
  adminActionSource,
  messageAccessSource,
  knowledgeAccessSource,
  firestoreRules,
  storageRules,
] = await Promise.all([
  read('artifacts/medstart/lib/user-profile.ts'),
  read('artifacts/medstart/components/dashboard/Navigation.ts'),
  read('artifacts/medstart/lib/server/moderation-control.ts'),
  read('artifacts/medstart/app/api/moderation/overview/route.ts'),
  read('artifacts/medstart/app/api/moderation/tutors/route.ts'),
  read('artifacts/medstart/lib/server/admin-control.ts'),
  read('artifacts/medstart/app/api/admin/action/route.ts'),
  read('artifacts/medstart/lib/server/message-access.ts'),
  read('artifacts/medstart/lib/server/knowledge-access.ts'),
  read('firestore.secure.rules'),
  read('storage.rules'),
])

assert.match(
  profileSource,
  /export type UserRole = 'student' \| 'tutor' \| 'admin' \| 'moderator'/,
)
assert.match(profileSource, /'suspended'/)

for (const marker of [
  'verifyIdToken(token, true)',
  "profile.role === 'admin' || profile.role === 'moderator'",
  "role: ModerationActorRole",
  "status !== 'active'",
  "collection('adminAuditLogs')",
]) {
  assert.equal(
    moderatorServerSource.includes(marker),
    true,
    `Missing isolated moderator server marker: ${marker}`,
  )
}

const moderatorNav = navigationSource.match(
  /const moderator = \[([\s\S]*?)\n\]\n\nconst admin =/,
)
assert.ok(moderatorNav, 'Moderator navigation block is missing')
assert.match(moderatorNav[1], /\/dashboard\/moderation/)
assert.doesNotMatch(moderatorNav[1], /\/dashboard\/admin/)
assert.doesNotMatch(moderatorNav[1], /\/dashboard\/messages/)

const restrictedTutorNav = navigationSource.match(
  /const restrictedTutor = \[([\s\S]*?)\n\]\n\nconst moderator =/,
)
assert.ok(restrictedTutorNav, 'Restricted tutor navigation block is missing')
assert.doesNotMatch(restrictedTutorNav[1], /\/dashboard\/(requests|schedule|students|messages|materials)/)
assert.match(
  navigationSource,
  /status === 'suspended' \? restrictedTutor : tutor/,
)

for (const forbidden of [
  'getFirebaseAdminAuth',
  'listUsers',
  "collection('bookings')",
  "collection('conversations')",
  "collection('adminAuditLogs')",
]) {
  assert.equal(
    moderatorOverviewSource.includes(forbidden),
    false,
    `Moderator overview must not expose broad administrative data: ${forbidden}`,
  )
}
for (const required of [
  'requireModerationActor',
  "where('role', '==', 'tutor')",
  "where('status', '==', 'pending')",
  'qualificationReference',
  'pendingKnowledge',
]) {
  assert.equal(
    moderatorOverviewSource.includes(required),
    true,
    `Moderator overview marker missing: ${required}`,
  )
}

for (const marker of [
  "type TutorDecision = 'approve' | 'reject' | 'suspend' | 'reinstate'",
  'runTransaction',
  "nextStatus = 'suspended'",
  "nextStatus = 'active'",
  "isPublic: nextStatus === 'active'",
  'writeModerationAudit',
]) {
  assert.equal(
    moderatorTutorSource.includes(marker),
    true,
    `Trusted tutor moderation marker missing: ${marker}`,
  )
}

assert.equal(
  adminServerSource.includes("profile.role === 'moderator'"),
  false,
  'Moderator must never satisfy the broad admin guard.',
)
assert.match(adminActionSource, /requireOwner\(actor\)/)
assert.match(adminActionSource, /'moderator'/)
assert.match(
  adminActionSource,
  /target\.role === 'admin' \|\|\s*target\.role === 'moderator'/,
)

assert.equal(
  messageAccessSource.includes("profile.role === 'moderator'"),
  false,
  'Moderator must not inherit message moderation privileges.',
)
assert.equal(
  messageAccessSource.includes("| 'moderator'"),
  false,
  'Moderator must remain outside MessageActorRole.',
)

assert.match(knowledgeAccessSource, /\| 'moderator'/)
assert.match(
  knowledgeAccessSource,
  /role === 'owner' \|\| role === 'admin' \|\| role === 'moderator'/,
)

for (const [label, rules] of [
  ['Firestore', firestoreRules],
  ['Storage', storageRules],
]) {
  const broadModerator = rules.match(
    /function isModerator\(\) \{([\s\S]*?)\n\s*\}/,
  )
  assert.ok(broadModerator, `${label} isModerator helper is missing`)
  assert.match(broadModerator[1], /isOwner\(\)/)
  assert.match(broadModerator[1], /isActiveAdmin\(\)/)
  assert.doesNotMatch(
    broadModerator[1],
    /moderator/,
    `${label} browser rules must not grant the dedicated moderator broad admin access.`,
  )
}

console.log('Moderator least-privilege contract tests passed.')
