import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getBytes, ref, uploadBytes } from 'firebase/storage'

const projectId = process.env.GCLOUD_PROJECT || 'demo-medstart'
const firestoreRules = await readFile('firestore.secure.rules', 'utf8')
const storageRules = await readFile('storage.rules', 'utf8')

const environment = await initializeTestEnvironment({
  projectId,
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: firestoreRules,
  },
  storage: {
    host: '127.0.0.1',
    port: 9199,
    rules: storageRules,
  },
})

const studentUid = 'critical-student'
const tutorUid = 'critical-tutor'
const blockedUid = 'critical-blocked'
const bookingId = 'critical-booking'
const conversationId = [studentUid, tutorUid].sort().join('__')

function profile(uid, role, status = 'active') {
  return {
    uid,
    firstName: role === 'tutor' ? 'Тест' : 'Учебный',
    lastName: role === 'tutor' ? 'Репетитор' : 'Студент',
    displayName: role === 'tutor' ? 'Тест Репетитор' : 'Учебный Студент',
    email: `${uid}@example.test`,
    role,
    status,
    rating: 0,
    reviewsCount: 0,
    isPublic: role === 'tutor',
    onboardingCompleted: true,
    avatar: '',
    lessonDuration: 60,
    lessonPrice: 1000,
    lessonFormats: ['online'],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

async function seed() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', studentUid), profile(studentUid, 'student'))
    await setDoc(doc(db, 'users', tutorUid), profile(tutorUid, 'tutor'))
    await setDoc(doc(db, 'users', blockedUid), profile(blockedUid, 'student', 'blocked'))
    await setDoc(doc(db, 'bookings', bookingId), {
      studentUid,
      studentName: 'Учебный Студент',
      studentAvatar: '',
      tutorUid,
      tutorName: 'Тест Репетитор',
      tutorAvatar: '',
      subject: 'Кардиология',
      goal: '',
      requestedDate: '2030-01-10',
      requestedTime: '12:00',
      timezone: 'Europe/Moscow',
      durationMinutes: 60,
      format: 'online',
      price: 1000,
      status: 'accepted',
      studentMessage: 'Тестовая заявка',
      tutorResponse: '',
      conversationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'conversations', conversationId), {
      participantUids: [studentUid, tutorUid],
      participantNames: {
        [studentUid]: 'Учебный Студент',
        [tutorUid]: 'Тест Репетитор',
      },
      participantAvatars: { [studentUid]: '', [tutorUid]: '' },
      latestBookingId: bookingId,
      lastMessage: 'Тест',
      lastSenderUid: studentUid,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'whiteboards', bookingId, 'elements', 'seed'), {
      id: 'seed',
      kind: 'text',
      color: '#111827',
      size: 4,
      opacity: 1,
      authorUid: tutorUid,
      authorName: 'Тест Репетитор',
      points: [],
      x: 0.1,
      y: 0.1,
      endX: 0.1,
      endY: 0.1,
      text: 'Учебная запись',
      createdAtMs: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'medicalWorkspaces', bookingId), {
      bookingId,
      clinicalCase: {},
      labs: [],
      ecg: {},
      privacy: {},
      boardBackground: {},
      updatedByUid: tutorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const storage = context.storage()
    await uploadBytes(
      ref(storage, `medical-workspaces/${bookingId}/${studentUid}/seed.png`),
      new Uint8Array([137, 80, 78, 71]),
      { contentType: 'image/png' },
    )
  })
}

async function run() {
  await environment.clearFirestore()
  await environment.clearStorage()
  await seed()

  const student = environment.authenticatedContext(studentUid, {
    email: `${studentUid}@example.test`,
    email_verified: true,
  })
  const tutor = environment.authenticatedContext(tutorUid, {
    email: `${tutorUid}@example.test`,
    email_verified: true,
  })
  const blocked = environment.authenticatedContext(blockedUid, {
    email: `${blockedUid}@example.test`,
    email_verified: true,
  })

  await assertSucceeds(getDoc(doc(student.firestore(), 'bookings', bookingId)))
  await assertSucceeds(
    getDoc(doc(tutor.firestore(), 'medicalWorkspaces', bookingId)),
  )

  await assertFails(getDoc(doc(blocked.firestore(), 'bookings', bookingId)))
  await assertFails(
    getDoc(doc(blocked.firestore(), 'conversations', conversationId)),
  )
  await assertFails(
    getDoc(doc(blocked.firestore(), 'whiteboards', bookingId, 'elements', 'seed')),
  )
  await assertFails(
    getDoc(doc(blocked.firestore(), 'medicalWorkspaces', bookingId)),
  )
  await assertFails(
    getBytes(
      ref(
        blocked.storage(),
        `medical-workspaces/${bookingId}/${studentUid}/seed.png`,
      ),
    ),
  )

  await assertFails(
    setDoc(doc(student.firestore(), 'bookings', 'client-created'), {
      studentUid,
      tutorUid,
      status: 'pending',
    }),
  )
  await assertFails(
    setDoc(doc(student.firestore(), 'conversations', 'client-created'), {
      participantUids: [studentUid, tutorUid],
    }),
  )
  await assertFails(
    setDoc(
      doc(
        student.firestore(),
        'medicalWorkspaces',
        bookingId,
        'assets',
        'client-created',
      ),
      {
        id: 'client-created',
        bookingId,
        uploaderUid: studentUid,
      },
    ),
  )
  await assertFails(
    uploadBytes(
      ref(
        student.storage(),
        `medical-workspaces/${bookingId}/${studentUid}/client.png`,
      ),
      new Uint8Array([137, 80, 78, 71]),
      { contentType: 'image/png' },
    ),
  )

  await assertSucceeds(
    updateDoc(doc(tutor.firestore(), 'bookings', bookingId), {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  )

  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users', studentUid), {
      status: 'blocked',
      updatedAt: serverTimestamp(),
    })
  })
  await assertFails(getDoc(doc(student.firestore(), 'bookings', bookingId)))

  console.log('Critical Firebase security rules regression suite passed.')
}

try {
  await run()
} finally {
  await environment.cleanup()
}
