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

const studentUid = 'message-student'
const tutorUid = 'message-tutor'
const outsiderUid = 'message-outsider'
const adminUid = 'message-admin'
const conversationId = [studentUid, tutorUid].sort().join('__')
const messageId = 'message-seed'

function profile(uid, role) {
  return {
    uid,
    firstName: 'Тест',
    lastName: role,
    displayName: `Тест ${role}`,
    email: `${uid}@example.test`,
    role,
    status: 'active',
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
    await setDoc(doc(db, 'users', outsiderUid), profile(outsiderUid, 'student'))
    await setDoc(doc(db, 'users', adminUid), profile(adminUid, 'admin'))
    await setDoc(doc(db, 'conversations', conversationId), {
      participantUids: [studentUid, tutorUid],
      participantNames: {
        [studentUid]: 'Тест student',
        [tutorUid]: 'Тест tutor',
      },
      participantAvatars: { [studentUid]: '', [tutorUid]: '' },
      latestBookingId: '',
      lastMessage: 'Защищённое сообщение',
      lastSenderUid: studentUid,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await setDoc(
      doc(db, 'conversations', conversationId, 'messages', messageId),
      {
        senderUid: tutorUid,
        senderName: 'Тест tutor',
        senderRole: 'tutor',
        kind: 'medical_note',
        text: 'Учебный разбор ЭКГ',
        medicalTag: 'ecg',
        mediaPath: '',
        mimeType: '',
        fileName: '',
        fileSize: 0,
        durationMs: 0,
        reactions: {},
        createdAt: serverTimestamp(),
      },
    )
    await uploadBytes(
      ref(
        context.storage(),
        `chat-media/${conversationId}/${studentUid}/seed.webm`,
      ),
      new Uint8Array([1, 2, 3, 4]),
      {
        contentType: 'audio/webm',
        customMetadata: { conversationId, uploaderUid: studentUid },
      },
    )
  })
}

function authenticated(uid) {
  return environment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true,
  })
}

async function run() {
  await environment.clearFirestore()
  await environment.clearStorage()
  await seed()

  const student = authenticated(studentUid)
  const tutor = authenticated(tutorUid)
  const outsider = authenticated(outsiderUid)
  const admin = authenticated(adminUid)

  await assertSucceeds(
    getDoc(doc(student.firestore(), 'conversations', conversationId)),
  )
  await assertSucceeds(
    getDoc(
      doc(
        tutor.firestore(),
        'conversations',
        conversationId,
        'messages',
        messageId,
      ),
    ),
  )
  await assertFails(
    getDoc(doc(outsider.firestore(), 'conversations', conversationId)),
  )
  await assertSucceeds(
    getDoc(
      doc(
        admin.firestore(),
        'conversations',
        conversationId,
        'messages',
        messageId,
      ),
    ),
  )

  // Rich messages are server-only. A participant cannot spoof sender role,
  // protected media metadata or the MedStart administrative badge.
  await assertFails(
    setDoc(
      doc(
        student.firestore(),
        'conversations',
        conversationId,
        'messages',
        'client-rich-message',
      ),
      {
        senderUid: studentUid,
        senderName: 'Поддельный администратор',
        senderRole: 'admin',
        kind: 'voice',
        text: '',
        medicalTag: '',
        mediaPath: `chat-media/${conversationId}/${studentUid}/fake.webm`,
        mimeType: 'audio/webm',
        fileName: 'fake.webm',
        fileSize: 4,
        durationMs: 1000,
        reactions: {},
        createdAt: serverTimestamp(),
      },
    ),
  )

  // The browser cannot access chat media directly even when it is a valid
  // conversation participant or active administrator. The authenticated
  // MedStart server is the only media gateway.
  const mediaPath = `chat-media/${conversationId}/${studentUid}/seed.webm`
  await assertFails(getBytes(ref(student.storage(), mediaPath)))
  await assertFails(getBytes(ref(admin.storage(), mediaPath)))
  await assertFails(
    uploadBytes(
      ref(
        student.storage(),
        `chat-media/${conversationId}/${studentUid}/client.webm`,
      ),
      new Uint8Array([1, 2, 3, 4]),
      { contentType: 'audio/webm' },
    ),
  )

  console.log('Medical messenger Firebase rules suite passed.')
}

try {
  await run()
} finally {
  await environment.cleanup()
}
