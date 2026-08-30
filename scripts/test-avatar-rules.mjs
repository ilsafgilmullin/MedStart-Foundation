import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'

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

const uid = 'avatar-server-only-user'
const path = `avatars/${uid}/profile.webp`
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

function profile() {
  return {
    uid,
    firstName: 'Тест',
    lastName: 'Пользователь',
    displayName: 'Тест Пользователь',
    email: `${uid}@example.test`,
    role: 'student',
    status: 'active',
    avatar: '',
    learnerTrack: 'medical',
    fieldOfStudy: 'medicine',
    studyYear: '2',
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

try {
  await environment.clearFirestore()
  await environment.clearStorage()

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid), profile())
  })

  const user = environment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true,
  })
  const anonymous = environment.unauthenticatedContext()

  // Avatar object mutations are trusted-server only.
  await assertFails(
    uploadBytes(ref(user.storage(), path), pngBytes, {
      contentType: 'image/png',
    }),
  )
  await assertFails(
    uploadBytes(ref(anonymous.storage(), path), pngBytes, {
      contentType: 'image/png',
    }),
  )

  await environment.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(ref(context.storage(), path), pngBytes, {
      contentType: 'image/webp',
    })
  })

  // Profile avatars remain public-readable for catalog rendering.
  await assertSucceeds(getBytes(ref(user.storage(), path)))
  await assertSucceeds(getBytes(ref(anonymous.storage(), path)))
  await assertFails(deleteObject(ref(user.storage(), path)))

  // A browser user may edit ordinary profile fields but can never point the
  // profile at an arbitrary avatar URL. Firebase Admin SDK bypasses Rules and
  // is the only writer used by /api/profile/avatar.
  await assertSucceeds(
    updateDoc(doc(user.firestore(), 'users', uid), {
      firstName: 'Новый',
      displayName: 'Новый Пользователь',
      updatedAt: serverTimestamp(),
    }),
  )
  await assertFails(
    updateDoc(doc(user.firestore(), 'users', uid), {
      avatar:
        'https://firebasestorage.googleapis.com/v0/b/example/o/avatars%2Fattacker%2Ffake.webp?alt=media',
      updatedAt: serverTimestamp(),
    }),
  )

  console.log('Avatar Storage + Firestore server-only integrity suite passed.')
} finally {
  await environment.cleanup()
}
