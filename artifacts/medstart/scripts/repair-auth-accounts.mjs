import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFile } from 'node:fs/promises'

const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const OWNER_EMAIL = 'ilsafgilmullin@yandex.ru'
const DELETE_TARGETS = [
  { uid: '9fstgmt4fFRJHYMRu83mnGVgAoj2', email: 'gsnji@gmail.com' },
  { uid: 'Mux9fAyd5WWrX5mi5OSW3Xzfbv23', email: 'stydent@gmail.com' },
]

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'medstart-e9bfe',
  })
}

const auth = getAuth()
const db = getFirestore()
const actions = []

const owner = await auth.getUser(OWNER_UID)
const ownerEmail = (owner.email ?? '').trim().toLowerCase()
if (ownerEmail !== OWNER_EMAIL) {
  throw new Error(
    `Owner email safety check failed: expected ${OWNER_EMAIL}, received ${ownerEmail || '(none)'}`,
  )
}

const ownerProfile = await db.doc(`users/${OWNER_UID}`).get()
if (!ownerProfile.exists) {
  throw new Error('Owner Firestore profile is missing; cleanup aborted.')
}

await auth.updateUser(OWNER_UID, {
  emailVerified: true,
  disabled: false,
})
actions.push({
  action: 'verify_owner',
  uid: OWNER_UID,
  email: OWNER_EMAIL,
  result: 'success',
})

for (const target of DELETE_TARGETS) {
  const account = await auth.getUser(target.uid).catch((error) => {
    if (error?.code === 'auth/user-not-found') return null
    throw error
  })

  if (!account) {
    actions.push({ ...target, action: 'delete_test_account', result: 'already_missing' })
    continue
  }

  const actualEmail = (account.email ?? '').trim().toLowerCase()
  if (actualEmail !== target.email) {
    throw new Error(
      `Delete safety check failed for ${target.uid}: expected ${target.email}, received ${actualEmail || '(none)'}`,
    )
  }
  if (target.uid === OWNER_UID || actualEmail === OWNER_EMAIL) {
    throw new Error('Delete safety check attempted to target the preserved owner account.')
  }

  await db.recursiveDelete(db.doc(`users/${target.uid}`))
  await db.doc(`tutorPrivateProfiles/${target.uid}`).delete().catch(() => undefined)
  await auth.deleteUser(target.uid)

  actions.push({
    ...target,
    action: 'delete_test_account',
    result: 'success',
  })
}

const repairedOwner = await auth.getUser(OWNER_UID)
if (!repairedOwner.emailVerified || repairedOwner.disabled) {
  throw new Error('Owner account verification did not persist.')
}

for (const target of DELETE_TARGETS) {
  const accountStillExists = await auth
    .getUser(target.uid)
    .then(() => true)
    .catch((error) => {
      if (error?.code === 'auth/user-not-found') return false
      throw error
    })
  if (accountStillExists) {
    throw new Error(`Target account ${target.uid} still exists after cleanup.`)
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  projectId: 'medstart-e9bfe',
  owner: {
    uid: OWNER_UID,
    email: OWNER_EMAIL,
    emailVerified: repairedOwner.emailVerified,
    disabled: repairedOwner.disabled,
    profileExists: ownerProfile.exists,
  },
  actions,
}

await writeFile('auth-repair-report.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`AUTH_REPAIR_OWNER_VERIFIED=${report.owner.emailVerified}`)
console.log(`AUTH_REPAIR_OWNER_DISABLED=${report.owner.disabled}`)
console.log(`AUTH_REPAIR_DELETED=${actions.filter((item) => item.result === 'success' && item.action === 'delete_test_account').length}`)
console.log('AUTH_REPAIR_STATUS=success')
