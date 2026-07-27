import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFile } from 'node:fs/promises'

const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const PRESERVED_EMAIL = 'ilsafgilmullin@yandex.ru'

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'medstart-e9bfe',
  })
}

const auth = getAuth()
const db = getFirestore()
const users = []
let pageToken

do {
  const page = await auth.listUsers(1000, pageToken)
  users.push(...page.users)
  pageToken = page.pageToken
} while (pageToken)

const records = []
for (const user of users) {
  const profileSnapshot = await db.doc(`users/${user.uid}`).get()
  const profile = profileSnapshot.exists ? profileSnapshot.data() : null
  const email = (user.email ?? '').trim().toLowerCase()
  const issues = []

  if (!profile) issues.push('missing_profile')
  if (!user.emailVerified) issues.push('unverified_email')
  if (profile?.email && String(profile.email).trim().toLowerCase() !== email) {
    issues.push('email_mismatch')
  }
  if (user.disabled && profile?.status !== 'blocked' && profile?.status !== 'deleted') {
    issues.push('auth_disabled_profile_accessible')
  }

  records.push({
    uid: user.uid,
    email,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    profileExists: profileSnapshot.exists,
    role: profile?.role ?? null,
    status: profile?.status ?? null,
    isOwner: user.uid === OWNER_UID,
    preserved: user.uid === OWNER_UID || email === PRESERVED_EMAIL,
    issues,
  })
}

const report = {
  generatedAt: new Date().toISOString(),
  projectId: 'medstart-e9bfe',
  totals: {
    authUsers: records.length,
    profilesPresent: records.filter((item) => item.profileExists).length,
    verifiedUsers: records.filter((item) => item.emailVerified).length,
    unverifiedUsers: records.filter((item) => !item.emailVerified).length,
    missingProfiles: records.filter((item) => item.issues.includes('missing_profile')).length,
    inconsistentUsers: records.filter((item) => item.issues.length > 0).length,
    preservedUsers: records.filter((item) => item.preserved).length,
  },
  users: records.sort((left, right) => left.email.localeCompare(right.email, 'ru')),
}

await writeFile('auth-audit-report.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`AUTH_AUDIT_TOTAL=${report.totals.authUsers}`)
console.log(`AUTH_AUDIT_VERIFIED=${report.totals.verifiedUsers}`)
console.log(`AUTH_AUDIT_UNVERIFIED=${report.totals.unverifiedUsers}`)
console.log(`AUTH_AUDIT_MISSING_PROFILES=${report.totals.missingProfiles}`)
console.log(`AUTH_AUDIT_INCONSISTENT=${report.totals.inconsistentUsers}`)
for (const record of report.users) {
  console.log(
    `AUTH_USER email=${record.email || '(none)'} uid=${record.uid} verified=${record.emailVerified} profile=${record.profileExists} role=${record.role ?? '-'} status=${record.status ?? '-'} preserved=${record.preserved} issues=${record.issues.join(',') || 'none'}`,
  )
}
