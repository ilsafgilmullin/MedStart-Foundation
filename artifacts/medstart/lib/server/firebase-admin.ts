import 'server-only'

import {
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

function readServiceAccount(): ServiceAccount {
  const serialized = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (serialized) {
    let parsed: ServiceAccountJson
    try {
      parsed = JSON.parse(serialized) as ServiceAccountJson
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON содержит некорректный JSON.',
      )
    }

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error(
        'В FIREBASE_SERVICE_ACCOUNT_JSON отсутствуют обязательные поля.',
      )
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    }
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n',
  )

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Серверный доступ Firebase ещё не настроен для видеокомнаты.',
    )
  }

  return { projectId, clientEmail, privateKey }
}

function getAdminApp(): App {
  const current = getApps()[0]
  if (current) return current

  return initializeApp({
    credential: cert(readServiceAccount()),
  })
}

export function getFirebaseAdminAuth() {
  return getAuth(getAdminApp())
}

export function getFirebaseAdminDb() {
  return getFirestore(getAdminApp())
}
