import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_KEYS = [
  'clinicalCase',
  'labs',
  'ecg',
  'privacy',
  'boardBackground',
] as const

type WorkspaceKey = (typeof ALLOWED_KEYS)[number]

interface SaveRequestBody {
  bookingId?: unknown
  patch?: unknown
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function bool(value: unknown) {
  return value === true
}

function sanitizeClinicalCase(value: unknown) {
  if (!isRecord(value)) throw new Error('INVALID_PATCH')
  return {
    complaint: text(value.complaint, 4_000),
    anamnesis: text(value.anamnesis, 8_000),
    examination: text(value.examination, 8_000),
    diagnosis: text(value.diagnosis, 4_000),
    differential: text(value.differential, 8_000),
    plan: text(value.plan, 8_000),
    teachingGoal: text(value.teachingGoal, 4_000),
  }
}

function sanitizeLabs(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error('INVALID_PATCH')
  }
  const seen = new Set<string>()
  return value.map((item) => {
    if (!isRecord(item)) throw new Error('INVALID_PATCH')
    const id = text(item.id, 160).trim()
    if (!/^[A-Za-z0-9_-]{6,160}$/.test(id) || seen.has(id)) {
      throw new Error('INVALID_PATCH')
    }
    seen.add(id)
    return {
      id,
      name: text(item.name, 300),
      value: text(item.value, 160),
      unit: text(item.unit, 80),
      referenceLow: text(item.referenceLow, 80),
      referenceHigh: text(item.referenceHigh, 80),
      note: text(item.note, 1_000),
    }
  })
}

function sanitizeEcg(value: unknown) {
  if (!isRecord(value)) throw new Error('INVALID_PATCH')
  return {
    rhythm: text(value.rhythm, 300),
    heartRate: text(value.heartRate, 40),
    axis: text(value.axis, 300),
    prMs: text(value.prMs, 40),
    qrsMs: text(value.qrsMs, 40),
    qtMs: text(value.qtMs, 40),
    qtcMs: text(value.qtcMs, 40),
    conclusion: text(value.conclusion, 8_000),
  }
}

function sanitizePrivacy(value: unknown) {
  if (!isRecord(value)) throw new Error('INVALID_PATCH')
  return {
    deidentified: bool(value.deidentified),
    identifiersRemoved: bool(value.identifiersRemoved),
    consentConfirmed: bool(value.consentConfirmed),
    educationalUseOnly: bool(value.educationalUseOnly),
    patientLabel: text(value.patientLabel, 160),
  }
}

function sanitizeBoardBackground(value: unknown) {
  if (!isRecord(value)) throw new Error('INVALID_PATCH')
  const kind = text(value.kind, 20)
  const anatomyLayer = text(value.anatomyLayer, 20)
  const anatomyView = text(value.anatomyView, 20)
  if (!['none', 'image', 'anatomy'].includes(kind)) {
    throw new Error('INVALID_PATCH')
  }
  if (!['organs', 'skeleton', 'vessels'].includes(anatomyLayer)) {
    throw new Error('INVALID_PATCH')
  }
  if (!['front', 'left', 'back', 'right'].includes(anatomyView)) {
    throw new Error('INVALID_PATCH')
  }
  return {
    kind,
    assetId: text(value.assetId, 160),
    label: text(value.label, 300),
    anatomyLayer,
    anatomyView,
    anatomyRegion: text(value.anatomyRegion, 80),
  }
}

function sanitizePatch(patch: unknown): {
  key: WorkspaceKey
  value: unknown
} {
  if (!isRecord(patch)) throw new Error('INVALID_PATCH')
  const keys = Object.keys(patch)
  if (keys.length !== 1 || !ALLOWED_KEYS.includes(keys[0] as WorkspaceKey)) {
    throw new Error('INVALID_PATCH')
  }
  const key = keys[0] as WorkspaceKey
  const raw = patch[key]
  const value =
    key === 'clinicalCase'
      ? sanitizeClinicalCase(raw)
      : key === 'labs'
        ? sanitizeLabs(raw)
        : key === 'ecg'
          ? sanitizeEcg(raw)
          : key === 'privacy'
            ? sanitizePrivacy(raw)
            : sanitizeBoardBackground(raw)
  return { key, value }
}

function mergeValue(key: WorkspaceKey, current: unknown, next: unknown) {
  if (key === 'labs') return next
  return {
    ...(isRecord(current) ? current : {}),
    ...(isRecord(next) ? next : {}),
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    return jsonError('Войдите в аккаунт MedStart ещё раз.', 401)
  }

  let body: SaveRequestBody
  try {
    body = (await request.json()) as SaveRequestBody
  } catch {
    return jsonError('Некорректный запрос сохранения.', 400)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(bookingId)) {
    return jsonError('Некорректный идентификатор занятия.', 400)
  }

  let sanitized: { key: WorkspaceKey; value: unknown }
  try {
    sanitized = sanitizePatch(body.patch)
  } catch {
    return jsonError('Медицинские данные имеют некорректную структуру.', 400)
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(
      authorization.slice('Bearer '.length),
      true,
    )
    const database = getFirebaseAdminDb()
    const userRef = database.collection('users').doc(decoded.uid)
    const bookingRef = database.collection('bookings').doc(bookingId)
    const workspaceRef = database.collection('medicalWorkspaces').doc(bookingId)
    const revisionRef = workspaceRef.collection('revisions').doc()

    await database.runTransaction(async (transaction) => {
      const [userSnapshot, bookingSnapshot, workspaceSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(bookingRef),
        transaction.get(workspaceRef),
      ])

      if (!userSnapshot.exists || userSnapshot.data()?.status !== 'active') {
        throw new Error('ACCOUNT_INACTIVE')
      }
      if (!bookingSnapshot.exists) throw new Error('BOOKING_NOT_FOUND')

      const booking = bookingSnapshot.data() as Record<string, unknown>
      const participant =
        booking.studentUid === decoded.uid || booking.tutorUid === decoded.uid
      if (!participant) throw new Error('FORBIDDEN')
      if (booking.status !== 'accepted') throw new Error('BOOKING_INACTIVE')

      const previous = workspaceSnapshot.exists ? workspaceSnapshot.data() || {} : {}
      const beforeValue = previous[sanitized.key] ?? null
      const afterValue = mergeValue(
        sanitized.key,
        beforeValue,
        sanitized.value,
      )
      const now = FieldValue.serverTimestamp()

      transaction.set(revisionRef, {
        bookingId,
        field: sanitized.key,
        before: beforeValue,
        after: afterValue,
        changedByUid: decoded.uid,
        createdAt: now,
      })

      transaction.set(
        workspaceRef,
        {
          bookingId,
          [sanitized.key]: afterValue,
          updatedByUid: decoded.uid,
          version: FieldValue.increment(1),
          lastRevisionId: revisionRef.id,
          updatedAt: now,
          ...(workspaceSnapshot.exists ? {} : { createdAt: now }),
        },
        { merge: true },
      )
    })

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const known: Record<string, [string, number]> = {
      ACCOUNT_INACTIVE: ['Аккаунт не имеет доступа к занятию.', 403],
      BOOKING_NOT_FOUND: ['Занятие не найдено.', 404],
      FORBIDDEN: ['У вас нет доступа к этому занятию.', 403],
      BOOKING_INACTIVE: ['Изменять данные можно только во время подтверждённого занятия.', 409],
    }
    if (known[code]) return jsonError(known[code][0], known[code][1])

    const authCode =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : ''
    if (authCode.startsWith('auth/')) {
      return jsonError('Сессия устарела. Войдите в MedStart ещё раз.', 401)
    }
    return jsonError('Не удалось безопасно сохранить медицинские данные.', 500)
  }
}
