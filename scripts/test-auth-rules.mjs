import './test-moderator-role.mjs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFile } from 'node:fs/promises'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

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
    setDoc(
      doc(unverified.firestore(), 'users', uid),
      studentProfile(uid, email),
    ),
  )
  await assertFails(
    setDoc(doc(verified.firestore(), 'users', uid), studentProfile(uid, email)),
  )

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), 'users', uid),
      studentProfile(uid, email),
    )
  })

  await assertFails(getDoc(doc(unverified.firestore(), 'users', uid)))
  await assertSucceeds(getDoc(doc(verified.firestore(), 'users', uid)))
  await assertSucceeds(
    updateDoc(doc(verified.firestore(), 'users', uid), {
      learnerTrack: 'school',
      schoolGrade: '9',
      schoolExam: 'oge',
      schoolConsentConfirmed: true,
      subjects: ['Русский язык', 'Математика'],
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    updateDoc(doc(verified.firestore(), 'users', uid), {
      schoolGrade: '10',
      schoolExam: 'oge',
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    updateDoc(doc(verified.firestore(), 'users', uid), {
      schoolConsentConfirmed: false,
      updatedAt: serverTimestamp(),
    }),
  )

  // Distributed abuse-control buckets are server-only. A signed-in browser
  // must never inspect, reset or inflate another requester's counters.
  const limiterProbe = doc(
    verified.firestore(),
    'securityRateLimits',
    'client-probe',
  )
  await assertFails(getDoc(limiterProbe))
  await assertFails(
    setDoc(limiterProbe, {
      count: 0,
      resetAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
    }),
  )

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

  const ownerUid = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
  const adminUid = 'auth-audit-admin'
  const moderatorUid = 'auth-least-privilege-moderator'
  const tutorUid = 'auth-private-tutor'
  const studentUid = 'auth-booking-student'
  const owner = environment.authenticatedContext(ownerUid, {
    email: 'owner@example.test',
    email_verified: true,
  })
  const admin = environment.authenticatedContext(adminUid, {
    email: `${adminUid}@example.test`,
    email_verified: true,
  })
  const moderator = environment.authenticatedContext(moderatorUid, {
    email: `${moderatorUid}@example.test`,
    email_verified: true,
  })

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', adminUid), {
      ...studentProfile(adminUid, `${adminUid}@example.test`),
      role: 'admin',
    })
    await setDoc(doc(context.firestore(), 'users', moderatorUid), {
      ...studentProfile(moderatorUid, `${moderatorUid}@example.test`),
      firstName: 'Тестовый',
      lastName: 'Модератор',
      displayName: 'Тестовый Модератор',
      role: 'moderator',
    })
    await setDoc(doc(context.firestore(), 'users', tutorUid), {
      ...studentProfile(tutorUid, `${tutorUid}@example.test`),
      firstName: 'Тестовый',
      lastName: 'Репетитор',
      displayName: 'Тестовый Репетитор',
      role: 'tutor',
      status: 'active',
      isPublic: true,
      specialization: 'Анатомия',
    })
    await setDoc(doc(context.firestore(), 'users', studentUid), {
      ...studentProfile(studentUid, `${studentUid}@example.test`),
    })
    await setDoc(doc(context.firestore(), 'tutorPrivateProfiles', tutorUid), {
      tutorUid,
      qualificationReference: 'private-qualification-reference',
      updatedAt: serverTimestamp(),
    })
    await setDoc(doc(context.firestore(), 'adminAuditLogs', 'seed-audit'), {
      actorUid: ownerUid,
      actorRole: 'owner',
      action: 'seed',
      summary: 'Rules audit seed',
      createdAt: serverTimestamp(),
    })
    await setDoc(doc(context.firestore(), 'bookings', 'moderator-hidden-booking'), {
      studentUid,
      tutorUid,
      status: 'accepted',
    })
    await setDoc(
      doc(context.firestore(), 'conversations', 'moderator-hidden-conversation'),
      {
        participantUids: [studentUid, tutorUid],
      },
    )
  })

  await assertSucceeds(
    getDoc(doc(owner.firestore(), 'adminAuditLogs', 'seed-audit')),
  )
  await assertFails(
    getDoc(doc(admin.firestore(), 'adminAuditLogs', 'seed-audit')),
  )
  await assertFails(
    setDoc(doc(owner.firestore(), 'adminAuditLogs', 'client-created'), {
      actorUid: ownerUid,
      action: 'client-write',
      createdAt: serverTimestamp(),
    }),
  )

  // A moderator is a server-assigned role, but it does not become a broad
  // Firestore administrator. The browser can read/edit only the moderator's own
  // safe profile; moderation data is delivered through trusted server APIs.
  await assertSucceeds(
    getDoc(doc(moderator.firestore(), 'users', moderatorUid)),
  )
  await assertFails(
    updateDoc(doc(moderator.firestore(), 'users', moderatorUid), {
      role: 'admin',
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    getDoc(doc(moderator.firestore(), 'adminAuditLogs', 'seed-audit')),
  )
  await assertFails(
    getDoc(
      doc(moderator.firestore(), 'tutorPrivateProfiles', tutorUid),
    ),
  )
  await assertFails(
    getDoc(
      doc(moderator.firestore(), 'bookings', 'moderator-hidden-booking'),
    ),
  )
  await assertFails(
    getDoc(
      doc(
        moderator.firestore(),
        'conversations',
        'moderator-hidden-conversation',
      ),
    ),
  )

  console.log(
    'Authentication, distributed limiter isolation, moderator least-privilege and server-only registration Firebase rules suite passed.',
  )
}

try {
  await run()
} finally {
  await environment.cleanup()
}
