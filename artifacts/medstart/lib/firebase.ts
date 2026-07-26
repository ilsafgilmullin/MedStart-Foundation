import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
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

export const auth = getAuth(app)

function createFirestore() {
  try {
    // Medical and lesson data stay in memory. Persistent browser storage is
    // intentionally disabled until encrypted device storage and remote logout
    // are implemented.
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    })
  } catch {
    return getFirestore(app)
  }
}

export const db = createFirestore()

export default app
