import 'server-only'

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

interface ServiceAccountJson {
  project_id?: string
  client_email?: string
  private_key?: string
}

function readExplicitServiceAccount(): ServiceAccount | null {
  const serialized = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (serialized) {
    let parsed: ServiceAccountJson
    try {
      parsed = JSON.parse(serialized) as ServiceAccountJson
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON')
    }

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is incomplete')
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    }
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey }
  }

  return null
}

function getAdminApp(): App {
  const current = getApps()[0]
  if (current) return current

  const explicit = readExplicitServiceAccount()
  return initializeApp({
    credential: explicit ? cert(explicit) : applicationDefault(),
    projectId:
      explicit?.projectId ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'medstart-e9bfe',
  })
}

export function getFirebaseAdminAuth() {
  return getAuth(getAdminApp())
}

export function getFirebaseAdminDb() {
  return getFirestore(getAdminApp())
}
