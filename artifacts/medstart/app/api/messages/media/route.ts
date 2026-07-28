import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getFirebaseAdminBucket } from '@/lib/server/firebase-admin'
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
const safeFiles = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])
const safeAudio = new Set([
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
])
const safeVideo = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

const uploadWindows = new Map<string, { startedAt: number; count: number }>()

function clean(value: unknown, max = 400) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function baseMime(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase()
}

function safeName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(-120) || 'media'
}

function parsePath(path: string) {
  const match = /^chat-media\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(path)
  if (!match) {
    throw new MessageAccessError(400, 'INVALID_MEDIA_PATH', 'Некорректный путь медиафайла.')
  }
  return { conversationId: match[1], uploaderUid: match[2], fileName: match[3] }
}

function enforceUploadRate(uid: string) {
  const now = Date.now()
  const current = uploadWindows.get(uid)
  if (!current || now - current.startedAt > 10 * 60_000) {
    uploadWindows.set(uid, { startedAt: now, count: 1 })
    return
  }
  current.count += 1
  if (current.count > 30) {
    throw new MessageAccessError(
      429,
      'UPLOAD_RATE_LIMIT',
      'Слишком много загрузок. Повторите позже.',
    )
  }
}

function validateUpload(file: File) {
  const mime = baseMime(file.type)
  const recorded = safeAudio.has(mime) || safeVideo.has(mime)
  const regular = safeFiles.has(mime)
  if (!recorded && !regular) {
    throw new MessageAccessError(
      415,
      'MEDIA_TYPE_REJECTED',
      'Этот тип файла не поддерживается MedStart.',
    )
  }
  const max = regular ? MAX_FILE_BYTES : MAX_MEDIA_BYTES
  if (file.size <= 0 || file.size > max) {
    throw new MessageAccessError(
      413,
      'MEDIA_TOO_LARGE',
      `Размер файла должен быть не больше ${regular ? 15 : 25} МБ.`,
    )
  }
  return mime
}

export async function POST(request: Request) {
  try {
    const actor = await requireMessageActor(request)
    enforceUploadRate(actor.uid)
    const form = await request.formData()
    const conversationId = clean(form.get('conversationId'))
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new MessageAccessError(400, 'FILE_REQUIRED', 'Файл не передан.')
    }
    await requireConversationAccess(conversationId, actor)
    const mime = validateUpload(file)
    const fileName = `${Date.now()}-${randomUUID()}-${safeName(file.name)}`
    const path = `chat-media/${conversationId}/${actor.uid}/${fileName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await getFirebaseAdminBucket().file(path).save(buffer, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType: file.type || mime,
        cacheControl: 'private, no-store, max-age=0',
        metadata: {
          conversationId,
          uploaderUid: actor.uid,
          originalName: file.name.slice(0, 240),
          uploadedByRole: actor.role,
        },
      },
    })

    return NextResponse.json(
      { ok: true, path },
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
    const [buffer] = await file.download()
    const disposition = safeFiles.has(baseMime(String(metadata.contentType || '')))
      ? `attachment; filename*=UTF-8''${encodeURIComponent(String(custom.originalName || parsed.fileName))}`
      : 'inline'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': String(metadata.contentType || 'application/octet-stream'),
        'Content-Length': String(buffer.byteLength),
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
