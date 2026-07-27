import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  inMemoryPersistence,
  setPersistence,
} from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore'

/**
 * Firebase web configuration is public client metadata. Keeping a stable
 * fallback prevents Replit preview restarts from silently pointing Auth and
 * Firestore at different projects when environment injection is delayed.
 */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyAt4F5JQAdQPw8kmY-0dorxcaT_JX2d3v0',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'medstart-e9bfe.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'medstart-e9bfe',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'medstart-e9bfe.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '291392319493',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:291392319493:web:694c330899fd86c312ec6c',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)

/**
 * All auth commands await this promise. Safari, private mode and embedded
 * Replit previews can reject IndexedDB/local persistence. In that case Auth
 * remains functional with an in-memory session instead of hanging or failing
 * before login, registration or password reset reaches Firebase.
 */
export const authReady = (async () => {
  try {
    await setPersistence(auth, browserLocalPersistence)
  } catch {
    await setPersistence(auth, inMemoryPersistence).catch(() => undefined)
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
  }
})()

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

export default app
