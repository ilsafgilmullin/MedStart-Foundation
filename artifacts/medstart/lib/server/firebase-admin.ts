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
import { MEDSTART_FIREBASE_PROJECT_ID } from '@/lib/firebase-public-config'

const ADMIN_APP_NAME = 'medstart-server-admin'

interface ServiceAccountJson {
  project_id?: string
  client_email?: string
  private_key?: string
}

export class FirebaseAdminConfigurationError extends Error {
  readonly code = 'FIREBASE_ADMIN_CONFIGURATION_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'FirebaseAdminConfigurationError'
  }
}

function validateProjectId(projectId: string) {
  if (projectId !== MEDSTART_FIREBASE_PROJECT_ID) {
    throw new FirebaseAdminConfigurationError(
      `Firebase Admin project does not match the MedStart web project (${MEDSTART_FIREBASE_PROJECT_ID}).`,
    )
  }
}

function readExplicitServiceAccount(): ServiceAccount | null {
  const serialized = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (serialized) {
    let parsed: ServiceAccountJson
    try {
      parsed = JSON.parse(serialized) as ServiceAccountJson
    } catch {
      throw new FirebaseAdminConfigurationError(
        'FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON.',
      )
    }

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new FirebaseAdminConfigurationError(
        'FIREBASE_SERVICE_ACCOUNT_JSON is incomplete.',
      )
    }

    validateProjectId(parsed.project_id)
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  const configuredCount = [projectId, clientEmail, privateKey].filter(Boolean).length

  if (configuredCount > 0 && configuredCount < 3) {
    throw new FirebaseAdminConfigurationError(
      'Firebase Admin variables are incomplete. Configure project ID, client email and private key together.',
    )
  }

  if (projectId && clientEmail && privateKey) {
    validateProjectId(projectId)
    return { projectId, clientEmail, privateKey }
  }

  return null
}

function hasApplicationDefaultCredentials() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
      process.env.GCLOUD_PROJECT?.trim(),
  )
}

function getAdminApp(): App {
  const current = getApps().find((app) => app.name === ADMIN_APP_NAME)
  if (current) return current

  const explicit = readExplicitServiceAccount()
  if (explicit) {
    return initializeApp(
      {
        credential: cert(explicit),
        projectId: explicit.projectId,
      },
      ADMIN_APP_NAME,
    )
  }

  if (hasApplicationDefaultCredentials()) {
    return initializeApp(
      {
        credential: applicationDefault(),
        projectId: MEDSTART_FIREBASE_PROJECT_ID,
      },
      ADMIN_APP_NAME,
    )
  }

  throw new FirebaseAdminConfigurationError(
    'Firebase Admin credentials are not configured on the MedStart server.',
  )
}

export function getFirebaseAdminAuth() {
  return getAuth(getAdminApp())
}

export function getFirebaseAdminDb() {
  return getFirestore(getAdminApp())
}

export function getFirebaseAdminProjectId() {
  return getAdminApp().options.projectId || MEDSTART_FIREBASE_PROJECT_ID
}
