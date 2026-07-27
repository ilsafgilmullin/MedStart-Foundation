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

/**
 * Firebase's web configuration is public client metadata. Keeping it here
 * makes local builds, Replit previews, and deployments use the same project
 * without depending on when Replit injects environment variables.
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

export default app
