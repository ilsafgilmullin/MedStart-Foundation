import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFile } from 'node:fs/promises'

const PROJECT_ID = 'medstart-e9bfe'
const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const OWNER_EMAIL = 'ilsafgilmullin@yandex.ru'

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
}

const auth = getAuth()
const db = getFirestore()
const findings = []
const accounts = []
let pageToken

do {
  const page = await auth.listUsers(1000, pageToken)
  for (const user of page.users) {
    const email = (user.email ?? '').trim().toLowerCase()
    const profileSnapshot = await db.doc(`users/${user.uid}`).get()
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    const issues = []

    if (!email) issues.push('missing_email')
    if (!user.emailVerified) issues.push('email_not_verified')
    if (user.disabled) issues.push('auth_disabled')
    if (!profileSnapshot.exists) issues.push('missing_firestore_profile')
    if (profile?.email && String(profile.email).trim().toLowerCase() !== email) issues.push('email_mismatch')
    if (!user.providerData.some((provider) => provider.providerId === 'password')) issues.push('password_provider_missing')
    if (profile?.status === 'blocked' || profile?.status === 'deleted') issues.push(`profile_${profile.status}`)

    accounts.push({
      uid: user.uid,
      email,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      providers: user.providerData.map((provider) => provider.providerId).sort(),
      profileExists: profileSnapshot.exists,
      role: profile?.role ?? null,
      status: profile?.status ?? null,
      isOwnerUid: user.uid === OWNER_UID,
      isOwnerEmail: email === OWNER_EMAIL,
      issues,
    })
  }
  pageToken = page.pageToken
} while (pageToken)

const ownerByUid = accounts.find((account) => account.uid === OWNER_UID)
const ownerByEmail = accounts.find((account) => account.email === OWNER_EMAIL)

if (!ownerByUid) findings.push('owner_uid_missing')
if (!ownerByEmail) findings.push('owner_email_missing')
if (ownerByUid && ownerByEmail && ownerByUid.uid !== ownerByEmail.uid) findings.push('owner_uid_email_split')
if (ownerByUid?.disabled) findings.push('owner_disabled')
if (ownerByUid && !ownerByUid.emailVerified) findings.push('owner_email_not_verified')
if (ownerByUid && !ownerByUid.profileExists) findings.push('owner_profile_missing')
if (ownerByUid && !ownerByUid.providers.includes('password')) findings.push('owner_password_provider_missing')
if (ownerByUid?.status === 'blocked' || ownerByUid?.status === 'deleted') findings.push(`owner_profile_${ownerByUid.status}`)

const duplicateEmails = Object.entries(
  accounts.reduce((map, account) => {
    if (account.email) map[account.email] = (map[account.email] ?? 0) + 1
    return map
  }, {}),
)
  .filter(([, count]) => count > 1)
  .map(([email]) => email)

if (duplicateEmails.length) findings.push('duplicate_auth_emails')

const report = {
  generatedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  totals: {
    authUsers: accounts.length,
    verified: accounts.filter((account) => account.emailVerified).length,
    disabled: accounts.filter((account) => account.disabled).length,
    missingProfiles: accounts.filter((account) => !account.profileExists).length,
    passwordProviderMissing: accounts.filter((account) => !account.providers.includes('password')).length,
    inconsistent: accounts.filter((account) => account.issues.length).length,
  },
  owner: ownerByUid ?? null,
  duplicateEmails,
  findings,
  accounts: accounts.sort((left, right) => left.email.localeCompare(right.email, 'ru')),
}

await writeFile('auth-complete-audit.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`AUTH_AUDIT_TOTAL=${report.totals.authUsers}`)
console.log(`AUTH_AUDIT_FINDINGS=${findings.join(',') || 'none'}`)
console.log(`AUTH_OWNER_PRESENT=${Boolean(ownerByUid)}`)
console.log(`AUTH_OWNER_VERIFIED=${ownerByUid?.emailVerified ?? false}`)
console.log(`AUTH_OWNER_DISABLED=${ownerByUid?.disabled ?? true}`)
console.log(`AUTH_OWNER_PROFILE=${ownerByUid?.profileExists ?? false}`)
console.log(`AUTH_OWNER_PASSWORD_PROVIDER=${ownerByUid?.providers.includes('password') ?? false}`)
console.log('AUTH_AUDIT_STATUS=success')
