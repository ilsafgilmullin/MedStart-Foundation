import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { writeFile } from 'node:fs/promises'

const PROJECT_ID = 'medstart-e9bfe'
const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const OWNER_EMAIL = 'ilsafgilmullin@yandex.ru'

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
}

const auth = getAuth()
const db = getFirestore()
const account = await auth.getUser(OWNER_UID)
const actualEmail = (account.email ?? '').trim().toLowerCase()

if (actualEmail !== OWNER_EMAIL) {
  throw new Error(
    `Owner safety check failed: expected ${OWNER_EMAIL}, received ${actualEmail || '(none)'}`,
  )
}

await auth.updateUser(OWNER_UID, {
  disabled: false,
  emailVerified: true,
})

const profileRef = db.doc(`users/${OWNER_UID}`)
const profileSnapshot = await profileRef.get()
let profileCreated = false

if (!profileSnapshot.exists) {
  profileCreated = true
  await profileRef.set({
    uid: OWNER_UID,
    firstName: 'Ильсаф',
    lastName: 'Гильмуллин',
    displayName: 'Ильсаф Гильмуллин',
    email: OWNER_EMAIL,
    role: 'student',
    status: 'active',
    avatar: '',
    fieldOfStudy: 'medicine',
    studyYear: '',
    title: '',
    specialization: '',
    subjects: [],
    institution: '',
    experience: '',
    bio: '',
    city: '',
    lessonPrice: 0,
    lessonDuration: 60,
    lessonFormats: ['online'],
    timezone: 'Europe/Moscow',
    rating: 0,
    reviewsCount: 0,
    isPublic: false,
    notificationPreferences: {
      bookingUpdates: true,
      newMessages: true,
      lessonReminders: true,
      productNews: false,
    },
    onboardingCompleted: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
} else {
  const profile = profileSnapshot.data() ?? {}
  const patch = {}
  if (profile.email !== OWNER_EMAIL) patch.email = OWNER_EMAIL
  if (profile.status === 'blocked' || profile.status === 'deleted') patch.status = 'active'
  if (!profile.uid) patch.uid = OWNER_UID
  if (Object.keys(patch).length) {
    patch.updatedAt = FieldValue.serverTimestamp()
    await profileRef.update(patch)
  }
}

const verified = await auth.getUser(OWNER_UID)
const finalProfile = await profileRef.get()
if (!verified.emailVerified || verified.disabled || !finalProfile.exists) {
  throw new Error('Owner account repair verification failed.')
}

const report = {
  projectId: PROJECT_ID,
  uid: OWNER_UID,
  email: OWNER_EMAIL,
  emailVerified: verified.emailVerified,
  disabled: verified.disabled,
  profileExists: finalProfile.exists,
  profileCreated,
  status: finalProfile.data()?.status ?? null,
  generatedAt: new Date().toISOString(),
}

await writeFile('auth-owner-repair-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(`AUTH_OWNER_EMAIL_VERIFIED=${report.emailVerified}`)
console.log(`AUTH_OWNER_DISABLED=${report.disabled}`)
console.log(`AUTH_OWNER_PROFILE_EXISTS=${report.profileExists}`)
console.log(`AUTH_OWNER_PROFILE_CREATED=${report.profileCreated}`)
console.log(`AUTH_OWNER_STATUS=${report.status}`)
console.log('AUTH_OWNER_REPAIR_STATUS=success')
