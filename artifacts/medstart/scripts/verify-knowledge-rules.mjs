import { deleteApp, initializeApp } from 'firebase/app'
import {
  Timestamp,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  connectStorageEmulator,
  getBytes,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage'

const projectId = process.env.GCLOUD_PROJECT || 'demo-medstart'
const ownerUid = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const studentUid = 'rules-student'
const tutorUid = 'rules-tutor'
const adminUid = 'rules-admin'

function context(uid) {
  const app = initializeApp(
    {
      apiKey: 'demo-key',
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      appId: `demo-${uid}`,
    },
    `rules-${uid}-${crypto.randomUUID()}`,
  )
  const firestore = getFirestore(app)
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080, {
    mockUserToken: { sub: uid, email: `${uid}@example.test` },
  })
  const storage = getStorage(app)
  connectStorageEmulator(storage, '127.0.0.1', 9199, {
    mockUserToken: { sub: uid, email: `${uid}@example.test` },
  })
  return { app, firestore, storage }
}

const owner = context(ownerUid)
const student = context(studentUid)
const tutor = context(tutorUid)
const admin = context(adminUid)

async function allowed(label, action) {
  try {
    await action()
    console.log(`PASS allow: ${label}`)
  } catch (error) {
    console.error(`FAIL allow: ${label}`)
    throw error
  }
}

async function denied(label, action) {
  try {
    await action()
  } catch {
    console.log(`PASS deny: ${label}`)
    return
  }
  throw new Error(`FAIL deny: ${label}`)
}

function profile(uid, role, status) {
  const now = Timestamp.now()
  return {
    uid,
    firstName: 'Rules',
    lastName: uid,
    displayName: `Rules ${uid}`,
    email: `${uid}@example.test`,
    role,
    status,
    rating: 0,
    reviewsCount: 0,
    isPublic: false,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
  }
}

function submission({
  id,
  sourceMode = 'link',
  filePath = '',
  fileName = '',
  fileSize = 0,
}) {
  const now = Timestamp.now()
  return {
    origin: 'tutor',
    status: 'pending',
    title: `Rules material ${id}`,
    description:
      'Медицинский учебный материал для автоматической проверки правил доступа.',
    kind: 'instruction',
    discipline: 'general',
    level: 'university',
    author: 'Rules Author',
    publicationYear: '2026',
    sourceMode,
    sourceUrl: sourceMode === 'link' ? 'https://example.test/material' : '',
    filePath,
    fileName,
    fileSize,
    mimeType: sourceMode === 'file' ? 'application/pdf' : '',
    submittedByUid: tutorUid,
    submittedByName: 'Rules Tutor',
    rightsConfirmed: true,
    medicalConfirmed: true,
    noPatientDataConfirmed: true,
    moderationNote: '',
    moderatedBy: '',
    moderatedAt: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

await allowed('student creates own profile', () =>
  setDoc(
    doc(student.firestore, 'users', studentUid),
    profile(studentUid, 'student', 'active'),
  ),
)
await allowed('tutor creates pending own profile', () =>
  setDoc(
    doc(tutor.firestore, 'users', tutorUid),
    profile(tutorUid, 'tutor', 'pending'),
  ),
)
await allowed('admin candidate creates student profile', () =>
  setDoc(
    doc(admin.firestore, 'users', adminUid),
    profile(adminUid, 'student', 'active'),
  ),
)
await allowed('owner activates tutor', () =>
  updateDoc(doc(owner.firestore, 'users', tutorUid), {
    status: 'active',
    isPublic: true,
    updatedAt: Timestamp.now(),
  }),
)
await allowed('owner promotes admin', () =>
  updateDoc(doc(owner.firestore, 'users', adminUid), {
    role: 'admin',
    status: 'active',
    updatedAt: Timestamp.now(),
  }),
)

const linkSubmissionId = 'rules-link'
await allowed('active tutor creates pending link', () =>
  setDoc(
    doc(tutor.firestore, 'knowledgeSubmissions', linkSubmissionId),
    submission({ id: linkSubmissionId }),
  ),
)
await denied('student cannot read pending submission', () =>
  getDoc(doc(student.firestore, 'knowledgeSubmissions', linkSubmissionId)),
)
await allowed('tutor reads own pending submission', () =>
  getDoc(doc(tutor.firestore, 'knowledgeSubmissions', linkSubmissionId)),
)
await denied('tutor cannot publish own submission', () =>
  updateDoc(doc(tutor.firestore, 'knowledgeSubmissions', linkSubmissionId), {
    status: 'published',
    moderatedBy: tutorUid,
    moderatedAt: Timestamp.now(),
    publishedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }),
)
await allowed(
  'student can query published collection without seeing pending',
  async () => {
    const result = await getDocs(
      query(
        collection(student.firestore, 'knowledgeSubmissions'),
        where('status', '==', 'published'),
      ),
    )
    if (!result.empty) throw new Error('Pending resource leaked into query.')
  },
)
await allowed('admin reads moderation queue', async () => {
  const result = await getDocs(
    query(
      collection(admin.firestore, 'knowledgeSubmissions'),
      where('status', '==', 'pending'),
    ),
  )
  if (result.size !== 1) throw new Error('Moderation queue is incomplete.')
})
await allowed('admin publishes tutor link', () =>
  updateDoc(doc(admin.firestore, 'knowledgeSubmissions', linkSubmissionId), {
    status: 'published',
    moderationNote: '',
    moderatedBy: adminUid,
    moderatedAt: Timestamp.now(),
    publishedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }),
)
await allowed('student reads published tutor link', () =>
  getDoc(doc(student.firestore, 'knowledgeSubmissions', linkSubmissionId)),
)

await allowed('student creates own bookmark', () =>
  setDoc(
    doc(
      student.firestore,
      'users',
      studentUid,
      'knowledgeBookmarks',
      'official-femb-library',
    ),
    {
      resourceId: 'official-femb-library',
      createdAt: Timestamp.now(),
    },
  ),
)
await denied('tutor cannot write student bookmark', () =>
  setDoc(
    doc(
      tutor.firestore,
      'users',
      studentUid,
      'knowledgeBookmarks',
      'forbidden',
    ),
    {
      resourceId: 'forbidden',
      createdAt: Timestamp.now(),
    },
  ),
)

const fileSubmissionId = 'rules-file'
const fileName = 'rules.pdf'
const filePath = `knowledge-submissions/${tutorUid}/${fileSubmissionId}/${fileName}`
const pdf = new TextEncoder().encode('%PDF-1.4\nrules')

await allowed('active tutor uploads PDF', () =>
  uploadBytes(ref(tutor.storage, filePath), pdf, {
    contentType: 'application/pdf',
  }),
)
await allowed('tutor creates pending PDF metadata', () =>
  setDoc(
    doc(tutor.firestore, 'knowledgeSubmissions', fileSubmissionId),
    submission({
      id: fileSubmissionId,
      sourceMode: 'file',
      filePath,
      fileName,
      fileSize: pdf.byteLength,
    }),
  ),
)
await denied('student cannot download pending PDF', () =>
  getBytes(ref(student.storage, filePath)),
)
await allowed('admin can inspect pending PDF', () =>
  getBytes(ref(admin.storage, filePath)),
)
await denied('student cannot upload into tutor folder', () =>
  uploadBytes(
    ref(
      student.storage,
      `knowledge-submissions/${tutorUid}/forbidden/forbidden.pdf`,
    ),
    pdf,
    { contentType: 'application/pdf' },
  ),
)
await allowed('admin publishes tutor PDF', () =>
  updateDoc(doc(admin.firestore, 'knowledgeSubmissions', fileSubmissionId), {
    status: 'published',
    moderationNote: '',
    moderatedBy: adminUid,
    moderatedAt: Timestamp.now(),
    publishedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }),
)
await allowed('student downloads published PDF', () =>
  getBytes(ref(student.storage, filePath)),
)

console.log('Knowledge-base rules verification passed.')
await Promise.all(
  [owner, student, tutor, admin].map(({ app }) => deleteApp(app)),
)
