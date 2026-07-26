import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { getBytes, ref, uploadBytes } from 'firebase/storage'

const projectId = 'demo-medstart-critical'
const ownerUid = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const adminUid = 'admin-critical-test'
const studentUid = 'student-critical-test'
const blockedUid = 'blocked-critical-test'
const tutorUid = 'tutor-critical-test'
const bookingId = 'booking-critical-test'
const conversationId = 'conversation-critical-test'
const assetId = 'asset-critical-test'
const medicalPath = `medical-workspaces/${bookingId}/${studentUid}/sample.png`

const firestoreRules = readFileSync(
  fileURLToPath(new URL('../../../firestore.rules', import.meta.url)),
  'utf8',
)
const storageRules = readFileSync(
  fileURLToPath(new URL('../../../storage.rules', import.meta.url)),
  'utf8',
)

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules: firestoreRules },
  storage: { rules: storageRules },
})

const activeStudent = testEnv.authenticatedContext(studentUid, {
  email: 'student@example.test',
  email_verified: true,
})
const blockedStudent = testEnv.authenticatedContext(blockedUid, {
  email: 'blocked@example.test',
  email_verified: true,
})
const activeTutor = testEnv.authenticatedContext(tutorUid, {
  email: 'tutor@example.test',
  email_verified: true,
})
const activeAdmin = testEnv.authenticatedContext(adminUid, {
  email: 'admin@example.test',
  email_verified: true,
})
const unauthenticated = testEnv.unauthenticatedContext()

try {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const now = Timestamp.now()

    const profiles = [
      [
        ownerUid,
        {
          uid: ownerUid,
          role: 'student',
          status: 'active',
          isPublic: false,
          displayName: 'Владелец',
        },
      ],
      [
        adminUid,
        {
          uid: adminUid,
          role: 'admin',
          status: 'active',
          isPublic: false,
          displayName: 'Администратор',
        },
      ],
      [
        studentUid,
        {
          uid: studentUid,
          role: 'student',
          status: 'active',
          isPublic: false,
          displayName: 'Активный студент',
        },
      ],
      [
        blockedUid,
        {
          uid: blockedUid,
          role: 'student',
          status: 'blocked',
          isPublic: false,
          displayName: 'Заблокированный студент',
        },
      ],
      [
        tutorUid,
        {
          uid: tutorUid,
          role: 'tutor',
          status: 'active',
          isPublic: true,
          displayName: 'Активный репетитор',
        },
      ],
    ]

    for (const [uid, profile] of profiles) {
      await setDoc(doc(db, 'users', uid), profile)
    }

    await setDoc(doc(db, 'bookings', bookingId), {
      studentUid,
      studentName: 'Активный студент',
      studentAvatar: '',
      tutorUid,
      tutorName: 'Активный репетитор',
      tutorAvatar: '',
      subject: 'Анатомия',
      goal: '',
      requestedDate: '2026-08-10',
      requestedTime: '12:00',
      timezone: 'Europe/Moscow',
      startsAt: now,
      durationMinutes: 60,
      format: 'online',
      price: 1_000,
      status: 'accepted',
      studentMessage: 'Тест',
      tutorResponse: '',
      conversationId,
      createdAt: now,
      updatedAt: now,
    })

    await setDoc(doc(db, 'bookings', 'blocked-booking-test'), {
      studentUid: blockedUid,
      tutorUid,
      status: 'accepted',
      format: 'online',
      requestedDate: '2026-08-10',
      requestedTime: '13:00',
      timezone: 'Europe/Moscow',
      durationMinutes: 60,
    })

    await setDoc(doc(db, 'conversations', conversationId), {
      participantUids: [studentUid, tutorUid],
      participantNames: {
        [studentUid]: 'Активный студент',
        [tutorUid]: 'Активный репетитор',
      },
      participantAvatars: { [studentUid]: '', [tutorUid]: '' },
      latestBookingId: bookingId,
      lastMessage: 'Тест',
      lastSenderUid: studentUid,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    })

    await setDoc(doc(db, 'conversations', 'blocked-conversation-test'), {
      participantUids: [blockedUid, tutorUid],
      participantNames: {
        [blockedUid]: 'Заблокированный студент',
        [tutorUid]: 'Активный репетитор',
      },
      participantAvatars: { [blockedUid]: '', [tutorUid]: '' },
      latestBookingId: 'blocked-booking-test',
      lastMessage: 'Тест',
      lastSenderUid: blockedUid,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    })

    await setDoc(doc(db, 'medicalWorkspaces', bookingId), {
      bookingId,
      clinicalCase: {},
      labs: [],
      ecg: {},
      privacy: {},
      boardBackground: {},
      updatedByUid: tutorUid,
      version: 1,
      createdAt: now,
      updatedAt: now,
    })

    await setDoc(
      doc(db, 'medicalWorkspaces', bookingId, 'assets', assetId),
      {
        id: assetId,
        bookingId,
        uploaderUid: studentUid,
        uploaderName: 'Активный студент',
        modality: 'xray',
        storagePath: medicalPath,
        fileName: 'sample.png',
        mimeType: 'image/png',
        fileSize: 4,
        deidentified: true,
        createdAt: now,
      },
    )

    await uploadBytes(
      ref(context.storage(), medicalPath),
      new Uint8Array([137, 80, 78, 71]),
      {
        contentType: 'image/png',
        customMetadata: {
          bookingId,
          uploaderUid: studentUid,
          deidentified: 'true',
          educationalUseOnly: 'true',
        },
      },
    )
  })

  const studentDb = activeStudent.firestore()
  const blockedDb = blockedStudent.firestore()
  const tutorDb = activeTutor.firestore()
  const adminDb = activeAdmin.firestore()

  await assertSucceeds(getDoc(doc(studentDb, 'bookings', bookingId)))
  await assertSucceeds(getDoc(doc(tutorDb, 'bookings', bookingId)))
  await assertFails(getDoc(doc(unauthenticated.firestore(), 'bookings', bookingId)))
  await assertFails(
    getDoc(doc(blockedDb, 'bookings', 'blocked-booking-test')),
  )

  await assertFails(
    setDoc(doc(studentDb, 'bookings', 'forged-booking-test'), {
      studentUid,
      tutorUid,
      price: 0,
      status: 'pending',
    }),
  )
  await assertFails(
    updateDoc(doc(tutorDb, 'bookings', bookingId), {
      status: 'completed',
      updatedAt: Timestamp.now(),
    }),
  )

  await assertSucceeds(
    getDoc(doc(studentDb, 'conversations', conversationId)),
  )
  await assertFails(
    getDoc(doc(blockedDb, 'conversations', 'blocked-conversation-test')),
  )

  const elementId = 'element-critical-test'
  await assertSucceeds(
    setDoc(doc(studentDb, 'whiteboards', bookingId, 'elements', elementId), {
      id: elementId,
      kind: 'pen',
      color: '#111827',
      size: 4,
      opacity: 1,
      authorUid: studentUid,
      authorName: 'Активный студент',
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
      x: 0.1,
      y: 0.1,
      endX: 0.2,
      endY: 0.2,
      text: '',
      createdAtMs: Date.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }),
  )
  await assertFails(
    setDoc(
      doc(
        blockedDb,
        'whiteboards',
        'blocked-booking-test',
        'elements',
        'blocked-element-test',
      ),
      {
        id: 'blocked-element-test',
        kind: 'pen',
        color: '#111827',
        size: 4,
        opacity: 1,
        authorUid: blockedUid,
        authorName: 'Заблокированный студент',
        points: [{ x: 0.1, y: 0.1 }],
        x: 0.1,
        y: 0.1,
        endX: 0.1,
        endY: 0.1,
        text: '',
        createdAtMs: Date.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ),
  )

  await assertFails(
    updateDoc(doc(studentDb, 'medicalWorkspaces', bookingId), {
      clinicalCase: { diagnosis: 'Подмена из клиента' },
      updatedAt: Timestamp.now(),
    }),
  )
  await assertFails(
    getDoc(doc(studentDb, 'medicalWorkspaces', bookingId, 'assets', assetId)),
  )
  await assertSucceeds(
    getDoc(doc(adminDb, 'medicalWorkspaces', bookingId, 'assets', assetId)),
  )

  const studentStorage = activeStudent.storage()
  const adminStorage = activeAdmin.storage()
  await assertFails(getBytes(ref(studentStorage, medicalPath)))
  await assertSucceeds(getBytes(ref(adminStorage, medicalPath)))
  await assertFails(
    uploadBytes(
      ref(studentStorage, `medical-workspaces/${bookingId}/${studentUid}/new.png`),
      new Uint8Array([1, 2, 3]),
      {
        contentType: 'image/png',
        customMetadata: {
          bookingId,
          uploaderUid: studentUid,
          deidentified: 'true',
          educationalUseOnly: 'true',
        },
      },
    ),
  )

  console.log('Critical Firebase Rules tests: OK')
} finally {
  await testEnv.cleanup()
}
