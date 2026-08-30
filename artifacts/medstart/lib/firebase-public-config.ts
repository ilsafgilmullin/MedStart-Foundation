export interface FirebasePublicConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const environmentConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
}

const configuredValues = Object.values(environmentConfig).filter(Boolean).length

if (configuredValues > 0 && configuredValues < 6) {
  throw new Error(
    'Firebase public configuration is incomplete. Configure all six NEXT_PUBLIC_FIREBASE_* variables together.',
  )
}

if (configuredValues === 0) {
  throw new Error(
    'Firebase public configuration is required. MedStart never falls back to the production Firebase project; configure this environment explicitly.',
  )
}

export const firebasePublicConfig: FirebasePublicConfig = {
  apiKey: environmentConfig.apiKey as string,
  authDomain: environmentConfig.authDomain as string,
  projectId: environmentConfig.projectId as string,
  storageBucket: environmentConfig.storageBucket as string,
  messagingSenderId: environmentConfig.messagingSenderId as string,
  appId: environmentConfig.appId as string,
}

export const MEDSTART_FIREBASE_PROJECT_ID = firebasePublicConfig.projectId
