import { createHash, randomUUID } from 'node:crypto'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { NextResponse } from 'next/server'
import { getFirebaseAdminBucket } from '@/lib/server/firebase-admin'
import {
  AuthSecurityConfigurationError,
  takeRateLimit,
} from '@/lib/server/auth-security'
import {
  buildStoredFileName,
  detectUploadType,
  isAttachmentMime,
  sanitizeOriginalFileName,
  type DetectedUploadType,
} from '@/lib/server/file-security'
import {
  MessageAccessError,
  messageErrorResponse,
  requireConversationAccess,
  requireMessageActor,
} from '@/lib/server/message-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MEDIA_BYTES = 25 * 1024 * 1024
const MAX_FILE_BYTES = 15 * 1024 * 1024
const SIGNATURE_BYTES = 512
const MEDIA_UPLOAD_WINDOW_MS = 10 * 60_000
const safeInlineMime = new Set([
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

function clean(value: unknown, max = 400) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function baseMime(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase()
}

function parsePath(path: string) {
  const match = /^chat-media\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(path)
  if (!match) {
    throw new MessageAccessError(400, 'INVALID_MEDIA_PATH', 'Некорректный путь медиафайла.')
  }
  return { conversationId: match[1], uploaderUid: match[2], fileName: match[3] }
}

async function enforceUploadRate(uid: string) {
  try {
    const limit = await takeRateLimit(
      `message-media-upload:account:${uid}`,
      30,
      MEDIA_UPLOAD_WINDOW_MS,
    )
    if (!limit.allowed) {
      throw new MessageAccessError(
        429,
        'UPLOAD_RATE_LIMIT',
        'Слишком много загрузок. Повторите позже.',
      )
    }
  } catch (error) {
    if (error instanceof MessageAccessError) throw error
    if (error instanceof AuthSecurityConfigurationError) {
      throw new MessageAccessError(
        503,
        'MEDIA_UPLOAD_SECURITY_UNAVAILABLE',
        'Защита загрузок временно не настроена. Повторите позже.',
      )
    }
    throw error
  }
}

async function validateUpload(file: File) {
  const signature = new Uint8Array(await file.slice(0, SIGNATURE_BYTES).arrayBuffer())
  const detected = detectUploadType(signature, file.type)
  if (!detected) {
    throw new MessageAccessError(
      415,
      'MEDIA_SIGNATURE_REJECTED',
      'Фактический тип файла не поддерживается или не совпадает с заявленным.',
    )
  }
  const regular = detected.category === 'file'
  const max = regular ? MAX_FILE_BYTES : MAX_MEDIA_BYTES
  if (file.size <= 0 || file.size > max) {
    throw new MessageAccessError(
      413,
      'MEDIA_TOO_LARGE',
      `Размер файла должен быть не больше ${regular ? 15 : 25} МБ.`,
    )
  }
  return detected
}

async function saveVerifiedUpload(
  file: File,
  path: string,
  detected: DetectedUploadType,
  customMetadata: Record<string, string>,
) {
  const object = getFirebaseAdminBucket().file(path)
  const digest = createHash('sha256')
  let uploadedBytes = 0
  const hashingStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      uploadedBytes += buffer.byteLength
      digest.update(buffer)
      callback(null, buffer)
    },
  })

  try {
    await pipeline(
      Readable.from(file.stream() as unknown as AsyncIterable<Uint8Array>),
      hashingStream,
      object.createWriteStream({
        resumable: false,
        validation: 'crc32c',
        metadata: {
          contentType: detected.mime,
          cacheControl: 'private, no-store, max-age=0',
          metadata: customMetadata,
        },
      }),
    )
    if (uploadedBytes !== file.size) {
      throw new MessageAccessError(
        400,
        'MEDIA_SIZE_MISMATCH',
        'Размер переданного файла не совпал с ожидаемым.',
      )
    }
    const sha256 = digest.digest('hex')
    await object.setMetadata({
      metadata: {
        ...customMetadata,
        sha256,
        uploadedBytes: String(uploadedBytes),
      },
    })
    return sha256
  } catch (error) {
    await object.delete({ ignoreNotFound: true }).catch(() => undefined)
    if (error instanceof MessageAccessError) throw error
    throw new MessageAccessError(
      500,
      'MEDIA_UPLOAD_FAILED',
      'Не удалось безопасно сохранить файл. Повторите позже.',
    )
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireMessageActor(request)
    await enforceUploadRate(actor.uid)
    const form = await request.formData()
    const conversationId = clean(form.get('conversationId'))
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new MessageAccessError(400, 'FILE_REQUIRED', 'Файл не передан.')
    }
    await requireConversationAccess(conversationId, actor)
    const detected = await validateUpload(file)
    const originalName = sanitizeOriginalFileName(file.name)
    const fileName = buildStoredFileName(originalName, detected.extension, randomUUID())
    const path = `chat-media/${conversationId}/${actor.uid}/${fileName}`
    const customMetadata = {
      conversationId,
      uploaderUid: actor.uid,
      originalName,
      uploadedByRole: actor.role,
      declaredMime: baseMime(file.type).slice(0, 120),
      detectedMime: detected.mime,
      securityStatus: 'signature-verified',
      malwareScanStatus: 'not-configured',
    }
    const sha256 = await saveVerifiedUpload(file, path, detected, customMetadata)

    return NextResponse.json(
      { ok: true, path, sha256 },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const response = messageErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireMessageActor(request)
    const path = clean(new URL(request.url).searchParams.get('path'), 1_000)
    const parsed = parsePath(path)
    await requireConversationAccess(parsed.conversationId, actor)

    const file = getFirebaseAdminBucket().file(path)
    const [exists] = await file.exists()
    if (!exists) {
      throw new MessageAccessError(404, 'MEDIA_NOT_FOUND', 'Медиафайл не найден.')
    }
    const [metadata] = await file.getMetadata()
    const custom = metadata.metadata || {}
    if (
      custom.conversationId !== parsed.conversationId ||
      custom.uploaderUid !== parsed.uploaderUid
    ) {
      throw new MessageAccessError(403, 'MEDIA_METADATA_REJECTED', 'Доступ к файлу отклонён.')
    }
    const size = Number(metadata.size || 0)
    if (!size || size > MAX_MEDIA_BYTES) {
      throw new MessageAccessError(413, 'MEDIA_TOO_LARGE', 'Файл превышает допустимый размер.')
    }
    const storedMime = baseMime(String(metadata.contentType || ''))
    const contentType =
      isAttachmentMime(storedMime) || safeInlineMime.has(storedMime)
        ? storedMime
        : 'application/octet-stream'
    const originalName = sanitizeOriginalFileName(String(custom.originalName || parsed.fileName))
    const disposition = isAttachmentMime(contentType)
      ? `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`
      : safeInlineMime.has(contentType)
        ? 'inline'
        : `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`
    const body = Readable.toWeb(file.createReadStream()) as ReadableStream<Uint8Array>

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(size),
        'Content-Disposition': disposition,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    const response = messageErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireMessageActor(request)
    const body = (await request.json()) as { path?: unknown }
    const path = clean(body.path, 1_000)
    const parsed = parsePath(path)
    await requireConversationAccess(parsed.conversationId, actor)
    if (!actor.moderator && parsed.uploaderUid !== actor.uid) {
      throw new MessageAccessError(403, 'DELETE_FORBIDDEN', 'Удалить этот файл нельзя.')
    }
    await getFirebaseAdminBucket().file(path).delete({ ignoreNotFound: true })
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const response = messageErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
