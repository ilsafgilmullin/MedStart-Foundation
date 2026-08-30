import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
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
const path = `avatars/${uid}/profile`
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

try {
  await environment.clearFirestore()
  await environment.clearStorage()

  const user = environment.authenticatedContext(uid, {
    email: `${uid}@example.test`,
    email_verified: true,
  })
  const anonymous = environment.unauthenticatedContext()

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
      contentType: 'image/png',
    })
  })

  // Profile avatars remain intentionally public-readable for catalog rendering,
  // but all create/update/delete operations are trusted-server only.
  await assertSucceeds(getBytes(ref(user.storage(), path)))
  await assertSucceeds(getBytes(ref(anonymous.storage(), path)))
  await assertFails(deleteObject(ref(user.storage(), path)))

  console.log('Avatar Storage rules server-only write suite passed.')
} finally {
  await environment.cleanup()
}
