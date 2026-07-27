export interface FirebasePublicConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const MEDSTART_DEFAULT_CONFIG: FirebasePublicConfig = {
  apiKey: 'AIzaSyAt4F5JQAdQPw8kmY-0dorxcaT_JX2d3v0',
  authDomain: 'medstart-e9bfe.firebaseapp.com',
  projectId: 'medstart-e9bfe',
  storageBucket: 'medstart-e9bfe.firebasestorage.app',
  messagingSenderId: '291392319493',
  appId: '1:291392319493:web:694c330899fd86c312ec6c',
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
    'Firebase public configuration is incomplete. Configure all NEXT_PUBLIC_FIREBASE_* variables or remove all of them to use the MedStart project profile.',
  )
}

export const firebasePublicConfig: FirebasePublicConfig =
  configuredValues === 6
    ? {
        apiKey: environmentConfig.apiKey as string,
        authDomain: environmentConfig.authDomain as string,
        projectId: environmentConfig.projectId as string,
        storageBucket: environmentConfig.storageBucket as string,
        messagingSenderId: environmentConfig.messagingSenderId as string,
        appId: environmentConfig.appId as string,
      }
    : MEDSTART_DEFAULT_CONFIG

export const MEDSTART_FIREBASE_PROJECT_ID = firebasePublicConfig.projectId
