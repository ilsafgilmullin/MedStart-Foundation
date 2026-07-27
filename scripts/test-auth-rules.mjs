import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFile } from 'node:fs/promises'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

const projectId = process.env.GCLOUD_PROJECT || 'demo-medstart'
const firestoreRules = await readFile('firestore.secure.rules', 'utf8')

const environment = await initializeTestEnvironment({
  projectId,
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: firestoreRules,
  },
})

function studentProfile(uid, email) {
  return {
    uid,
    firstName: 'Тестовый',
    lastName: 'Студент',
    displayName: 'Тестовый Студент',
    email,
    role: 'student',
    status: 'active',
    avatar: '',
    fieldOfStudy: 'medicine',
    studyYear: '1',
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

async function run() {
  await environment.clearFirestore()

  const uid = 'auth-server-only-registration'
  const email = `${uid}@example.test`
  const unverified = environment.authenticatedContext(uid, {
    email,
    email_verified: false,
  })
  const verified = environment.authenticatedContext(uid, {
    email,
    email_verified: true,
  })

  // Profile creation is server-only. Neither verified nor unverified clients may
  // bypass the MedStart registration API and create their own active profile.
  await assertFails(
    setDoc(doc(unverified.firestore(), 'users', uid), studentProfile(uid, email)),
  )
  await assertFails(
    setDoc(doc(verified.firestore(), 'users', uid), studentProfile(uid, email)),
  )

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid), studentProfile(uid, email))
  })

  await assertFails(getDoc(doc(unverified.firestore(), 'users', uid)))
  await assertSucceeds(getDoc(doc(verified.firestore(), 'users', uid)))

  const mismatchedUid = 'auth-email-mismatch'
  const mismatched = environment.authenticatedContext(mismatchedUid, {
    email: `${mismatchedUid}@example.test`,
    email_verified: true,
  })
  await assertFails(
    setDoc(
      doc(mismatched.firestore(), 'users', mismatchedUid),
      studentProfile(mismatchedUid, 'different@example.test'),
    ),
  )

  const privilegedUid = 'auth-privileged-self-registration'
  const privilegedEmail = `${privilegedUid}@example.test`
  const privileged = environment.authenticatedContext(privilegedUid, {
    email: privilegedEmail,
    email_verified: true,
  })
  await assertFails(
    setDoc(doc(privileged.firestore(), 'users', privilegedUid), {
      ...studentProfile(privilegedUid, privilegedEmail),
      role: 'admin',
    }),
  )

  console.log('Authentication and server-only registration Firebase rules suite passed.')
}

try {
  await run()
} finally {
  await environment.cleanup()
}
