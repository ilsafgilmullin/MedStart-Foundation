import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
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

const studentUid = 'knowledge-student'
const tutorUid = 'knowledge-tutor'
const adminUid = 'knowledge-admin'
const pendingId = 'KnowledgePending123'
const publishedId = 'KnowledgePublished123'

function context(uid) {
  return environment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true,
  })
}

function profile(uid, role) {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: `Rules ${role}`,
    role,
    status: 'active',
  }
}

function submission(id, status) {
  return {
    origin: 'tutor',
    status,
    title: `Rules material ${id}`,
    description:
      'Медицинский учебный материал для проверки server-only правил доступа.',
    kind: 'instruction',
    discipline: 'general',
    level: 'university',
    author: 'Rules Author',
    publicationYear: '2026',
    sourceMode: 'file',
    sourceUrl: '',
    filePath:
      status === 'published'
        ? `knowledge-published/${id}/${id}.pdf`
        : `knowledge-quarantine/${tutorUid}/${id}/${id}.pdf`,
    fileName: `${id}.pdf`,
    fileSize: 16,
    mimeType: 'application/pdf',
    sha256: 'a'.repeat(64),
    securityStatus: 'signature-verified',
    malwareScanStatus: 'not-configured',
    storageState: status === 'published' ? 'published' : 'quarantined',
    submittedByUid: tutorUid,
    submittedByName: 'Rules tutor',
    rightsConfirmed: true,
    medicalConfirmed: true,
    noPatientDataConfirmed: true,
    moderationNote: '',
    moderatedBy: status === 'published' ? adminUid : '',
    moderatedAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

await environment.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore()
  await setDoc(doc(db, 'users', studentUid), profile(studentUid, 'student'))
  await setDoc(doc(db, 'users', tutorUid), profile(tutorUid, 'tutor'))
  await setDoc(doc(db, 'users', adminUid), profile(adminUid, 'admin'))
  await setDoc(
    doc(db, 'knowledgeSubmissions', pendingId),
    submission(pendingId, 'pending'),
  )
  await setDoc(
    doc(db, 'knowledgeSubmissions', publishedId),
    submission(publishedId, 'published'),
  )

  const pdf = new TextEncoder().encode('%PDF-1.7\nserver-managed')
  await uploadBytes(
    ref(
      context.storage(),
      `knowledge-quarantine/${tutorUid}/${pendingId}/${pendingId}.pdf`,
    ),
    pdf,
    { contentType: 'application/pdf' },
  )
  await uploadBytes(
    ref(
      context.storage(),
      `knowledge-published/${publishedId}/${publishedId}.pdf`,
    ),
    pdf,
    { contentType: 'application/pdf' },
  )
})

const student = context(studentUid)
const tutor = context(tutorUid)
const admin = context(adminUid)

await assertFails(
  setDoc(
    doc(tutor.firestore(), 'knowledgeSubmissions', 'DirectCreateBlocked123'),
    submission('DirectCreateBlocked123', 'pending'),
  ),
)
await assertFails(
  updateDoc(doc(admin.firestore(), 'knowledgeSubmissions', pendingId), {
    status: 'published',
  }),
)
await assertFails(
  deleteDoc(doc(tutor.firestore(), 'knowledgeSubmissions', pendingId)),
)
await assertFails(
  deleteDoc(doc(admin.firestore(), 'knowledgeSubmissions', pendingId)),
)

await assertFails(
  getDoc(doc(student.firestore(), 'knowledgeSubmissions', pendingId)),
)
await assertSucceeds(
  getDoc(doc(tutor.firestore(), 'knowledgeSubmissions', pendingId)),
)
await assertSucceeds(
  getDoc(doc(admin.firestore(), 'knowledgeSubmissions', pendingId)),
)
await assertSucceeds(
  getDoc(doc(student.firestore(), 'knowledgeSubmissions', publishedId)),
)

const pdf = new TextEncoder().encode('%PDF-1.7\ndirect-client-write')
for (const path of [
  `knowledge-submissions/${tutorUid}/LegacyBlocked123/direct.pdf`,
  `knowledge-quarantine/${tutorUid}/QuarantineBlocked123/direct.pdf`,
  'knowledge-published/PublishedBlocked123/direct.pdf',
]) {
  await assertFails(
    uploadBytes(ref(tutor.storage(), path), pdf, {
      contentType: 'application/pdf',
    }),
  )
}

await assertFails(
  getBytes(
    ref(
      student.storage(),
      `knowledge-published/${publishedId}/${publishedId}.pdf`,
    ),
  ),
)
await assertFails(
  getBytes(
    ref(
      admin.storage(),
      `knowledge-quarantine/${tutorUid}/${pendingId}/${pendingId}.pdf`,
    ),
  ),
)

console.log('Knowledge server-only Rules tests passed.')
await environment.cleanup()
