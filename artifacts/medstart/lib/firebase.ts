import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check'
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
import { firebasePublicConfig } from '@/lib/firebase-public-config'

const app = getApps().length ? getApp() : initializeApp(firebasePublicConfig)

type MedStartGlobal = typeof globalThis & {
  __medstartAppCheck?: AppCheck
}

const appCheckSiteKey = String(
  process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY || '',
).trim()

export const appCheckConfigured = appCheckSiteKey.length > 0

function createAppCheck(): AppCheck | null {
  if (typeof window === 'undefined' || !appCheckConfigured) return null

  const scope = globalThis as MedStartGlobal
  if (scope.__medstartAppCheck) return scope.__medstartAppCheck

  const instance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
  scope.__medstartAppCheck = instance
  return instance
}

// App Check is initialized before Auth/Firestore instances so configured web
// clients can attach attestation to Firebase requests. Enforcement remains a
// separate Firebase Console rollout after request metrics have been observed.
export const appCheck = createAppCheck()

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
