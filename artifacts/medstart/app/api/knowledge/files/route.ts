import { createHash, randomUUID } from 'node:crypto'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { NextResponse } from 'next/server'
import { getFirebaseAdminBucket, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  AuthSecurityConfigurationError,
  takeRateLimit,
} from '@/lib/server/auth-security'
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

const KNOWLEDGE_UPLOAD_WINDOW_MS = 30 * 60_000
const MAX_MULTIPART_OVERHEAD = 512 * 1024

function enforceMultipartLength(request: Request) {
  const raw = request.headers.get('content-length')
  if (!raw) return
  const length = Number(raw)
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new KnowledgeAccessError(
      400,
      'KNOWLEDGE_CONTENT_LENGTH_INVALID',
      'Размер запроса указан некорректно.',
    )
  }
  if (length > MAX_KNOWLEDGE_PDF_SIZE + MAX_MULTIPART_OVERHEAD) {
    throw new KnowledgeAccessError(
      413,
      'KNOWLEDGE_REQUEST_TOO_LARGE',
      'Размер запроса с PDF превышает допустимый предел.',
    )
  }
}

async function enforceUploadRate(uid: string) {
  try {
    const limit = await takeRateLimit(
      `knowledge-upload:account:${uid}`,
      10,
      KNOWLEDGE_UPLOAD_WINDOW_MS,
    )
    if (!limit.allowed) {
      throw new KnowledgeAccessError(
        429,
        'KNOWLEDGE_UPLOAD_RATE_LIMIT',
        'Слишком много загрузок. Повторите позже.',
      )
    }
  } catch (error) {
    if (error instanceof KnowledgeAccessError) throw error
    if (error instanceof AuthSecurityConfigurationError) {
      throw new KnowledgeAccessError(
        503,
        'KNOWLEDGE_UPLOAD_SECURITY_UNAVAILABLE',
        'Защита загрузок временно не настроена. Повторите позже.',
      )
    }
    throw error
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
  let uploadedPath = ''

  try {
    enforceMultipartLength(request)
    const actor = await requireKnowledgeActor(request)
    requireTutor(actor)
    await enforceUploadRate(actor.uid)

    const form = await request.formData()
    const submissionId = validateKnowledgeSubmissionId(form.get('submissionId'))
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new KnowledgeAccessError(400, 'FILE_REQUIRED', 'PDF-файл не передан.')
    }

    const db = getFirebaseAdminDb()
    const submissionRef = db.collection('knowledgeSubmissions').doc(submissionId)
    const existingSubmission = await submissionRef.get()
    if (existingSubmission.exists) {
      throw new KnowledgeAccessError(
        409,
        'KNOWLEDGE_SUBMISSION_ALREADY_EXISTS',
        'Заявка уже создана. Заменить её PDF после отправки на модерацию нельзя.',
      )
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
    uploadedPath = `knowledge-quarantine/${actor.uid}/${submissionId}/${storedName}`
    const sha256 = await saveQuarantinedPdf({
      file,
      path: uploadedPath,
      submissionId,
      tutorUid: actor.uid,
      originalName,
    })

    const submissionAfterUpload = await submissionRef.get()
    if (submissionAfterUpload.exists) {
      await getFirebaseAdminBucket()
        .file(uploadedPath)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined)
      uploadedPath = ''
      throw new KnowledgeAccessError(
        409,
        'KNOWLEDGE_SUBMISSION_ALREADY_EXISTS',
        'Заявка была создана во время загрузки. Повторная замена PDF запрещена.',
      )
    }

    return NextResponse.json(
      {
        ok: true,
        filePath: uploadedPath,
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
    if (uploadedPath) {
      await getFirebaseAdminBucket()
        .file(uploadedPath)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined)
    }
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
      const isCurrentFile = data.filePath === path
      if (isCurrentFile) {
        const allowed =
          actor.moderator ||
          (data.submittedByUid === actor.uid &&
            (data.status === 'pending' || data.status === 'rejected'))
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

      const ownQuarantineOrphan =
        parsed.kind === 'quarantine' &&
        parsed.uploaderUid === actor.uid &&
        data.submittedByUid === actor.uid
      const moderatorQuarantineOrphan =
        parsed.kind === 'quarantine' && actor.moderator

      if (!ownQuarantineOrphan && !moderatorQuarantineOrphan) {
        throw new KnowledgeAccessError(
          403,
          'KNOWLEDGE_ORPHAN_DELETE_FORBIDDEN',
          'Удалить этот непривязанный файл нельзя.',
        )
      }

      await getFirebaseAdminBucket().file(path).delete({ ignoreNotFound: true })
      return NextResponse.json(
        { ok: true, orphanDeleted: true },
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
      { ok: true, orphanDeleted: true },
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
