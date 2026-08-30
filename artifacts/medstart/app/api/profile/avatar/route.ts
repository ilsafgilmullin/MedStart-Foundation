import { createHash, randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminBucket,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'
import { detectUploadType } from '@/lib/server/file-security'
import { normalizeAvatarImage } from '@/lib/server/avatar-image'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD = 512 * 1024
const SIGNATURE_BYTES = 64
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
}

function publicAvatarUrl(bucketName: string, path: string) {
  const encodedPath = encodeURIComponent(path)
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodedPath}?alt=media`
}

function managedAvatarPath(value: unknown, bucketName: string, uid: string) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'firebasestorage.googleapis.com'
    ) {
      return ''
    }
    const prefix = `/v0/b/${encodeURIComponent(bucketName)}/o/`
    if (!url.pathname.startsWith(prefix)) return ''
    const path = decodeURIComponent(url.pathname.slice(prefix.length))
    return path.startsWith(`avatars/${uid}/`) ? path : ''
  } catch {
    return ''
  }
}

export async function POST(request: Request) {
  const token = bearerToken(request)
  if (!token) return jsonError('Требуется авторизация.', 401)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_AVATAR_SIZE + MAX_MULTIPART_OVERHEAD
  ) {
    return jsonError('Размер фотографии не должен превышать 5 МБ.', 413)
  }

  let uploadedPath = ''
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
    if (!decoded.email_verified) {
      return jsonError('Подтвердите электронную почту.', 403)
    }

    const db = getFirebaseAdminDb()
    const profileRef = db.collection('users').doc(decoded.uid)
    const profileSnapshot = await profileRef.get()
    if (!profileSnapshot.exists) {
      return jsonError('Профиль пользователя не найден.', 404)
    }

    const status = String(profileSnapshot.data()?.status || '')
    if (status === 'blocked' || status === 'deleted') {
      return jsonError('Аккаунт не может изменять фотографию профиля.', 403)
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return jsonError('Файл фотографии не передан.', 400)
    }
    if (file.size <= 0 || file.size > MAX_AVATAR_SIZE) {
      return jsonError('Размер фотографии не должен превышать 5 МБ.', 413)
    }

    const signature = new Uint8Array(
      await file.slice(0, SIGNATURE_BYTES).arrayBuffer(),
    )
    const detected = detectUploadType(signature, file.type)
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      return jsonError(
        'Фактический формат фотографии должен быть JPG, PNG или WebP.',
        415,
      )
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.byteLength !== file.size || bytes.byteLength > MAX_AVATAR_SIZE) {
      return jsonError('Размер переданного файла не прошёл проверку.', 400)
    }

    const normalized = await normalizeAvatarImage(bytes)
    const sha256 = createHash('sha256').update(normalized.bytes).digest('hex')
    const bucket = getFirebaseAdminBucket()
    uploadedPath = `avatars/${decoded.uid}/${randomUUID()}.webp`
    const object = bucket.file(uploadedPath)

    await object.save(normalized.bytes, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType: normalized.mimeType,
        cacheControl: 'public, max-age=3600',
        metadata: {
          ownerUid: decoded.uid,
          declaredMime: String(file.type || '').slice(0, 120),
          sourceMime: detected.mime,
          detectedMime: normalized.mimeType,
          sha256,
          width: String(normalized.width),
          height: String(normalized.height),
          metadataStripped: 'true',
          securityStatus: 'decoded-reencoded',
        },
      },
    })

    const avatarUrl = publicAvatarUrl(bucket.name, uploadedPath)
    let previousAvatarPath = ''
    await db.runTransaction(async (transaction) => {
      const latestProfile = await transaction.get(profileRef)
      if (!latestProfile.exists) {
        throw new Error('PROFILE_MISSING_DURING_AVATAR_UPDATE')
      }
      const latest = latestProfile.data() || {}
      const latestStatus = String(latest.status || '')
      if (latestStatus === 'blocked' || latestStatus === 'deleted') {
        throw new Error('PROFILE_UNAVAILABLE_DURING_AVATAR_UPDATE')
      }
      previousAvatarPath = managedAvatarPath(
        latest.avatar,
        bucket.name,
        decoded.uid,
      )
      transaction.update(profileRef, {
        avatar: avatarUrl,
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    if (previousAvatarPath && previousAvatarPath !== uploadedPath) {
      await bucket
        .file(previousAvatarPath)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined)
    }
    uploadedPath = ''

    return NextResponse.json(
      {
        ok: true,
        avatarUrl,
        mimeType: normalized.mimeType,
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    )
  } catch (error) {
    if (uploadedPath) {
      await getFirebaseAdminBucket()
        .file(uploadedPath)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined)
    }
    console.error('Trusted avatar upload failed', error)
    return jsonError('Не удалось безопасно загрузить фотографию.', 503)
  }
}
