import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
} from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { firebasePublicConfig } from '@/lib/firebase-public-config'

const app = getApps().length ? getApp() : initializeApp(firebasePublicConfig)

function createAuth() {
  try {
    // Safari, private browsing and embedded Replit previews do not always offer
    // the same storage backend. Firebase tries these in order and falls back to
    // an in-memory session instead of failing the whole sign-in operation.
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
    })
  } catch {
    // Hot reload can initialize Auth for the same app more than once.
    return getAuth(app)
  }
}

export const auth = createAuth()
auth.useDeviceLanguage()

function createFirestore() {
  try {
    // Medical and lesson data must not remain in a persistent browser cache
    // after logout or on a shared device. Firestore still keeps pending writes
    // in memory while the current page is open.
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    })
  } catch {
    // Hot reload can initialize the same Firebase app more than once.
    return getFirestore(app)
  }
}

export const db = createFirestore()
export const storage = getStorage(app)

export default app
