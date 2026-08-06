import { createHash, randomUUID } from 'node:crypto'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { NextResponse } from 'next/server'
import { getFirebaseAdminBucket, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  buildStoredFileName,
  detectUploadType,
  sanitizeOriginalFileName,
} from '@/lib/server/file-security'
import {
  KnowledgeAccessError,
  knowledgeErrorResponse,
  requireKnowledgeActor,
  requireTutor,
} from '@/lib/server/knowledge-access'
import {
  canonicalKnowledgePdfName,
  KNOWLEDGE_SIGNATURE_BYTES,
  MAX_KNOWLEDGE_PDF_SIZE,
  parseKnowledgeStoragePath,
  validateKnowledgeSubmissionId,
} from '@/lib/server/knowledge-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const uploadWindows = new Map<string, { startedAt: number; count: number }>()

function enforceUploadRate(uid: string) {
  const now = Date.now()
  const current = uploadWindows.get(uid)
  if (!current || now - current.startedAt > 30 * 60_000) {
    uploadWindows.set(uid, { startedAt: now, count: 1 })
    return
  }
  current.count += 1
  if (current.count > 10) {
    throw new KnowledgeAccessError(
      429,
      'KNOWLEDGE_UPLOAD_RATE_LIMIT',
      'Слишком много загрузок. Повторите позже.',
    )
  }
}

async function validatePdf(file: File) {
  if (file.size <= 0 || file.size > MAX_KNOWLEDGE_PDF_SIZE) {
    throw new KnowledgeAccessError(
      413,
      'KNOWLEDGE_FILE_TOO_LARGE',
      'Размер PDF не должен превышать 25 МБ.',
    )
  }
  const signature = new Uint8Array(
    await file.slice(0, KNOWLEDGE_SIGNATURE_BYTES).arrayBuffer(),
  )
  const detected = detectUploadType(signature, file.type)
  if (!detected || detected.mime !== 'application/pdf') {
    throw new KnowledgeAccessError(
      415,
      'KNOWLEDGE_SIGNATURE_REJECTED',
      'Фактический тип файла не является поддерживаемым PDF.',
    )
  }
  return detected
}

async function saveQuarantinedPdf(input: {
  file: File
  path: string
  submissionId: string
  tutorUid: string
  originalName: string
}) {
  const object = getFirebaseAdminBucket().file(input.path)
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
  const customMetadata = {
    submissionId: input.submissionId,
    tutorUid: input.tutorUid,
    originalName: input.originalName,
    declaredMime: String(input.file.type || '').slice(0, 120),
    detectedMime: 'application/pdf',
    securityStatus: 'signature-verified',
    malwareScanStatus: 'not-configured',
    storageState: 'quarantined',
  }

  try {
    await pipeline(
      Readable.from(input.file.stream() as unknown as AsyncIterable<Uint8Array>),
      hashingStream,
      object.createWriteStream({
        resumable: false,
        validation: 'crc32c',
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'private, no-store, max-age=0',
          metadata: customMetadata,
        },
      }),
    )
    if (uploadedBytes !== input.file.size) {
      throw new KnowledgeAccessError(
        400,
        'KNOWLEDGE_SIZE_MISMATCH',
        'Размер переданного PDF не совпал с ожидаемым.',
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
    if (error instanceof KnowledgeAccessError) throw error
    throw new KnowledgeAccessError(
      500,
      'KNOWLEDGE_UPLOAD_FAILED',
      'Не удалось безопасно сохранить PDF. Повторите позже.',
    )
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireKnowledgeActor(request)
    requireTutor(actor)
    enforceUploadRate(actor.uid)

    const form = await request.formData()
    const submissionId = validateKnowledgeSubmissionId(form.get('submissionId'))
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new KnowledgeAccessError(400, 'FILE_REQUIRED', 'PDF-файл не передан.')
    }
    await validatePdf(file)

    const originalName = canonicalKnowledgePdfName(
      sanitizeOriginalFileName(file.name),
    )
    const storedName = buildStoredFileName(
      originalName,
      'pdf',
      randomUUID(),
    )
    const path = `knowledge-quarantine/${actor.uid}/${submissionId}/${storedName}`
    const sha256 = await saveQuarantinedPdf({
      file,
      path,
      submissionId,
      tutorUid: actor.uid,
      originalName,
    })

    return NextResponse.json(
      {
        ok: true,
        filePath: path,
        fileName: originalName,
        fileSize: file.size,
        mimeType: 'application/pdf',
        sha256,
        securityStatus: 'signature-verified',
        malwareScanStatus: 'not-configured',
        storageState: 'quarantined',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const response = knowledgeErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireKnowledgeActor(request)
    const path = new URL(request.url).searchParams.get('path') || ''
    const parsed = parseKnowledgeStoragePath(path)
    const snapshot = await getFirebaseAdminDb()
      .collection('knowledgeSubmissions')
      .doc(parsed.submissionId)
      .get()
    if (!snapshot.exists) {
      throw new KnowledgeAccessError(
        404,
        'KNOWLEDGE_NOT_FOUND',
        'Учебный материал не найден.',
      )
    }
    const data = snapshot.data() as {
      status?: string
      sourceMode?: string
      filePath?: string
      fileName?: string
      fileSize?: number
      mimeType?: string
      submittedByUid?: string
      sha256?: string
    }
    if (data.sourceMode !== 'file' || data.filePath !== path) {
      throw new KnowledgeAccessError(
        403,
        'KNOWLEDGE_FILE_MISMATCH',
        'Доступ к файлу отклонён.',
      )
    }
    const allowed =
      actor.moderator ||
      data.submittedByUid === actor.uid ||
      data.status === 'published'
    if (!allowed) {
      throw new KnowledgeAccessError(
        403,
        'KNOWLEDGE_FILE_FORBIDDEN',
        'Этот файл недоступен.',
      )
    }

    const object = getFirebaseAdminBucket().file(path)
    const [exists] = await object.exists()
    if (!exists) {
      throw new KnowledgeAccessError(
        404,
        'KNOWLEDGE_FILE_NOT_FOUND',
        'PDF-файл не найден.',
      )
    }
    const [metadata] = await object.getMetadata()
    const custom = metadata.metadata || {}
    const size = Number(metadata.size || 0)
    if (
      !size ||
      size > MAX_KNOWLEDGE_PDF_SIZE ||
      metadata.contentType !== 'application/pdf'
    ) {
      throw new KnowledgeAccessError(
        415,
        'KNOWLEDGE_FILE_METADATA_REJECTED',
        'Метаданные PDF не прошли проверку.',
      )
    }
    if (
      parsed.kind !== 'legacy' &&
      (custom.submissionId !== parsed.submissionId ||
        custom.securityStatus !== 'signature-verified' ||
        (data.sha256 && custom.sha256 !== data.sha256))
    ) {
      throw new KnowledgeAccessError(
        403,
        'KNOWLEDGE_SECURITY_METADATA_REJECTED',
        'Проверка целостности файла не пройдена.',
      )
    }

    const downloadName = canonicalKnowledgePdfName(
      String(data.fileName || custom.originalName || parsed.fileName),
    )
    const body = Readable.toWeb(object.createReadStream()) as ReadableStream<Uint8Array>
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(size),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    const response = knowledgeErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireKnowledgeActor(request)
    const body = (await request.json()) as { path?: unknown }
    const path = typeof body.path === 'string' ? body.path : ''
    const parsed = parseKnowledgeStoragePath(path)
    const snapshot = await getFirebaseAdminDb()
      .collection('knowledgeSubmissions')
      .doc(parsed.submissionId)
      .get()

    if (snapshot.exists) {
      const data = snapshot.data() as {
        filePath?: string
        submittedByUid?: string
        status?: string
      }
      const allowed =
        data.filePath === path &&
        (actor.moderator ||
          (data.submittedByUid === actor.uid &&
            (data.status === 'pending' || data.status === 'rejected')))
      if (!allowed) {
        throw new KnowledgeAccessError(
          403,
          'KNOWLEDGE_DELETE_FORBIDDEN',
          'Удалить этот файл нельзя.',
        )
      }
      return NextResponse.json(
        { ok: true, deferredToSubmissionDelete: true },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (
      !actor.moderator &&
      (parsed.kind !== 'quarantine' || parsed.uploaderUid !== actor.uid)
    ) {
      throw new KnowledgeAccessError(
        403,
        'KNOWLEDGE_ORPHAN_DELETE_FORBIDDEN',
        'Удалить незавершённую загрузку нельзя.',
      )
    }
    await getFirebaseAdminBucket().file(path).delete({ ignoreNotFound: true })
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const response = knowledgeErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
