import { createHash, randomUUID } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { AdminAccessError } from '@/lib/server/admin-control'
import {
  moderationErrorResponse,
  requireModerationActor,
  type ModerationActor,
} from '@/lib/server/moderation-control'
import {
  getFirebaseAdminBucket,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'
import { detectUploadType } from '@/lib/server/file-security'
import {
  canonicalKnowledgePdfName,
  KNOWLEDGE_SIGNATURE_BYTES,
  MAX_KNOWLEDGE_PDF_SIZE,
  parseKnowledgeStoragePath,
  validateKnowledgeSubmissionId,
} from '@/lib/server/knowledge-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MODERATION_LEASE_MS = 10 * 60_000

type KnowledgeSubmissionData = {
  title?: string
  status?: string
  sourceMode?: string
  filePath?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  sha256?: string
  securityStatus?: string
  malwareScanStatus?: string
  submittedByUid?: string
  moderationLeaseId?: string
  moderationLeaseExpiresAt?: Timestamp
}

async function hashStorageObject(path: string) {
  const digest = createHash('sha256')
  let bytes = 0
  for await (const chunk of getFirebaseAdminBucket().file(path).createReadStream()) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.byteLength
    if (bytes > MAX_KNOWLEDGE_PDF_SIZE) {
      throw new AdminAccessError(
        413,
        'KNOWLEDGE_FILE_TOO_LARGE',
        'PDF превышает допустимый размер.',
      )
    }
    digest.update(buffer)
  }
  if (!bytes) {
    throw new AdminAccessError(
      415,
      'KNOWLEDGE_FILE_EMPTY',
      'PDF-файл пуст.',
    )
  }
  return { sha256: digest.digest('hex'), bytes }
}

function isActiveLease(data: KnowledgeSubmissionData, nowMs: number) {
  const leaseId =
    typeof data.moderationLeaseId === 'string' ? data.moderationLeaseId : ''
  const expiresAt = data.moderationLeaseExpiresAt
  return Boolean(
    leaseId &&
      expiresAt &&
      typeof expiresAt.toMillis === 'function' &&
      expiresAt.toMillis() > nowMs,
  )
}

function assertPending(data: KnowledgeSubmissionData) {
  if (data.status !== 'pending') {
    throw new AdminAccessError(
      409,
      'KNOWLEDGE_NOT_PENDING',
      'Материал уже обработан другим модератором.',
    )
  }
}

function adminAuditData(input: {
  actor: ModerationActor
  decision: 'approve' | 'reject'
  submissionId: string
  data: KnowledgeSubmissionData
  note: string
  publishedCopyPath?: string
}) {
  return {
    actorUid: input.actor.uid,
    actorName: input.actor.displayName,
    actorEmail: input.actor.email,
    actorRole: input.actor.role,
    action:
      input.decision === 'approve'
        ? 'approve_knowledge_submission'
        : 'reject_knowledge_submission',
    summary:
      input.decision === 'approve'
        ? `Опубликован учебный материал «${String(
            input.data.title || input.submissionId,
          )}».`
        : `Отклонён учебный материал «${String(
            input.data.title || input.submissionId,
          )}».`,
    targetUid: input.submissionId,
    targetType: 'knowledgeSubmission',
    metadata: {
      submittedByUid: String(input.data.submittedByUid || ''),
      sourceMode: String(input.data.sourceMode || ''),
      previousFilePath: String(input.data.filePath || ''),
      publishedFilePath: input.publishedCopyPath || '',
      securityStatus:
        input.decision === 'approve' && input.data.sourceMode === 'file'
          ? 'signature-verified'
          : 'not-applicable',
      malwareScanStatus:
        input.decision === 'approve' && input.data.sourceMode === 'file'
          ? 'not-configured'
          : 'not-applicable',
      moderationNote: input.note,
    },
    createdAt: FieldValue.serverTimestamp(),
  }
}

async function releaseModerationLease(
  submissionId: string,
  leaseId: string,
) {
  if (!leaseId) return
  const db = getFirebaseAdminDb()
  const submissionRef = db.collection('knowledgeSubmissions').doc(submissionId)
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(submissionRef)
    if (!snapshot.exists) return
    const data = snapshot.data() as KnowledgeSubmissionData
    if (
      data.status === 'pending' &&
      data.moderationLeaseId === leaseId
    ) {
      transaction.update(submissionRef, {
        moderationLeaseId: FieldValue.delete(),
        moderationLeaseExpiresAt: FieldValue.delete(),
        moderationLeaseBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  })
}

export async function POST(request: Request) {
  let publishedCopyPath = ''
  let moderationLeaseId = ''
  let moderationFinalized = false
  let submissionId = ''

  try {
    const actor = await requireModerationActor(request)
    const body = (await request.json()) as {
      submissionId?: unknown
      decision?: unknown
      note?: unknown
    }
    submissionId = validateKnowledgeSubmissionId(body.submissionId)
    const decision =
      body.decision === 'approve' || body.decision === 'reject'
        ? body.decision
        : ''
    const note =
      typeof body.note === 'string' ? body.note.trim().slice(0, 1_000) : ''

    if (!decision) {
      throw new AdminAccessError(
        400,
        'INVALID_MODERATION_DECISION',
        'Некорректное решение модерации.',
      )
    }
    if (decision === 'reject' && note.length < 3) {
      throw new AdminAccessError(
        400,
        'REJECTION_REASON_REQUIRED',
        'Укажите причину отклонения.',
      )
    }

    const db = getFirebaseAdminDb()
    const submissionRef = db.collection('knowledgeSubmissions').doc(submissionId)
    const auditRef = db.collection('adminAuditLogs').doc()
    moderationLeaseId = randomUUID()
    const nowMs = Date.now()

    const plan = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(submissionRef)
      if (!snapshot.exists) {
        throw new AdminAccessError(
          404,
          'KNOWLEDGE_NOT_FOUND',
          'Учебный материал не найден.',
        )
      }

      const data = snapshot.data() as KnowledgeSubmissionData
      assertPending(data)

      if (isActiveLease(data, nowMs)) {
        throw new AdminAccessError(
          409,
          'KNOWLEDGE_MODERATION_IN_PROGRESS',
          'Материал уже обрабатывается другим модератором.',
        )
      }

      const requiresFilePipeline =
        decision === 'approve' && data.sourceMode === 'file'

      if (requiresFilePipeline) {
        transaction.update(submissionRef, {
          moderationLeaseId,
          moderationLeaseBy: actor.uid,
          moderationLeaseExpiresAt: Timestamp.fromMillis(
            nowMs + MODERATION_LEASE_MS,
          ),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return { requiresFilePipeline: true as const, data }
      }

      transaction.update(submissionRef, {
        status: decision === 'approve' ? 'published' : 'rejected',
        moderationNote: note,
        moderatedBy: actor.uid,
        moderatedAt: FieldValue.serverTimestamp(),
        publishedAt:
          decision === 'approve' ? FieldValue.serverTimestamp() : null,
        moderationLeaseId: FieldValue.delete(),
        moderationLeaseExpiresAt: FieldValue.delete(),
        moderationLeaseBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.set(
        auditRef,
        adminAuditData({
          actor,
          decision,
          submissionId,
          data,
          note,
        }),
      )
      return { requiresFilePipeline: false as const, data }
    })

    if (!plan.requiresFilePipeline) {
      moderationFinalized = true
      return NextResponse.json(
        {
          ok: true,
          status: decision === 'approve' ? 'published' : 'rejected',
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const data = plan.data
    const sourcePath = String(data.filePath || '')
    const parsed = parseKnowledgeStoragePath(sourcePath)
    if (
      parsed.submissionId !== submissionId ||
      (parsed.kind === 'quarantine' &&
        parsed.uploaderUid !== String(data.submittedByUid || ''))
    ) {
      throw new AdminAccessError(
        403,
        'KNOWLEDGE_FILE_PATH_REJECTED',
        'Файл не соответствует заявке.',
      )
    }

    const source = getFirebaseAdminBucket().file(sourcePath)
    const [exists] = await source.exists()
    if (!exists) {
      throw new AdminAccessError(
        404,
        'KNOWLEDGE_FILE_NOT_FOUND',
        'PDF-файл не найден.',
      )
    }

    const [metadata] = await source.getMetadata()
    const custom = metadata.metadata || {}
    const size = Number(metadata.size || 0)
    if (
      metadata.contentType !== 'application/pdf' ||
      !size ||
      size > MAX_KNOWLEDGE_PDF_SIZE
    ) {
      throw new AdminAccessError(
        415,
        'KNOWLEDGE_FILE_METADATA_REJECTED',
        'Метаданные PDF не прошли проверку.',
      )
    }

    if (
      parsed.kind === 'quarantine' &&
      (custom.submissionId !== submissionId ||
        custom.tutorUid !== String(data.submittedByUid || '') ||
        custom.securityStatus !== 'signature-verified' ||
        custom.storageState !== 'quarantined')
    ) {
      throw new AdminAccessError(
        403,
        'KNOWLEDGE_SECURITY_METADATA_REJECTED',
        'Проверка метаданных карантинного PDF не пройдена.',
      )
    }

    const [header] = await source.download({
      start: 0,
      end: KNOWLEDGE_SIGNATURE_BYTES - 1,
    })
    const detected = detectUploadType(
      new Uint8Array(header),
      String(metadata.contentType || ''),
    )
    if (!detected || detected.mime !== 'application/pdf') {
      throw new AdminAccessError(
        415,
        'KNOWLEDGE_SIGNATURE_REJECTED',
        'Фактический тип файла не является PDF.',
      )
    }

    const hashed = await hashStorageObject(sourcePath)
    if (hashed.bytes !== size) {
      throw new AdminAccessError(
        409,
        'KNOWLEDGE_FILE_SIZE_MISMATCH',
        'Размер PDF изменился после отправки на модерацию.',
      )
    }

    const submissionSha = String(data.sha256 || '')
    const metadataSha = String(custom.sha256 || '')
    const validSubmissionSha = /^[a-f0-9]{64}$/.test(submissionSha)
    const validMetadataSha = /^[a-f0-9]{64}$/.test(metadataSha)

    if (
      parsed.kind !== 'legacy' &&
      (!validSubmissionSha ||
        !validMetadataSha ||
        submissionSha !== hashed.sha256 ||
        metadataSha !== hashed.sha256)
    ) {
      throw new AdminAccessError(
        409,
        'KNOWLEDGE_FILE_HASH_MISMATCH',
        'Контрольная сумма PDF изменилась после отправки на модерацию.',
      )
    }
    if (
      parsed.kind === 'legacy' &&
      ((validSubmissionSha && submissionSha !== hashed.sha256) ||
        (validMetadataSha && metadataSha !== hashed.sha256))
    ) {
      throw new AdminAccessError(
        409,
        'KNOWLEDGE_FILE_HASH_MISMATCH',
        'Контрольная сумма legacy PDF не совпала с сохранённой.',
      )
    }
    if (
      typeof data.fileSize === 'number' &&
      data.fileSize > 0 &&
      data.fileSize !== hashed.bytes
    ) {
      throw new AdminAccessError(
        409,
        'KNOWLEDGE_FILE_SIZE_MISMATCH',
        'Размер PDF не совпал с заявкой.',
      )
    }

    const sha256 = hashed.sha256
    const uploadedBytes = hashed.bytes
    const originalName = canonicalKnowledgePdfName(
      String(data.fileName || custom.originalName || parsed.fileName),
    )

    publishedCopyPath =
      `knowledge-published/${submissionId}/${moderationLeaseId}-${parsed.fileName}`
    const destination = getFirebaseAdminBucket().file(publishedCopyPath)
    await source.copy(destination)
    await destination.setMetadata({
      contentType: 'application/pdf',
      cacheControl: 'private, no-store, max-age=0',
      metadata: {
        submissionId,
        tutorUid: String(data.submittedByUid || ''),
        originalName,
        detectedMime: 'application/pdf',
        securityStatus: 'signature-verified',
        malwareScanStatus: 'not-configured',
        storageState: 'published',
        sha256,
        uploadedBytes: String(uploadedBytes),
        moderatedBy: actor.uid,
        moderationLeaseId,
      },
    })

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(submissionRef)
      if (!snapshot.exists) {
        throw new AdminAccessError(
          404,
          'KNOWLEDGE_NOT_FOUND',
          'Учебный материал не найден.',
        )
      }
      const current = snapshot.data() as KnowledgeSubmissionData
      assertPending(current)
      if (current.moderationLeaseId !== moderationLeaseId) {
        throw new AdminAccessError(
          409,
          'KNOWLEDGE_MODERATION_LEASE_LOST',
          'Блокировка модерации была потеряна. Повторите действие.',
        )
      }

      transaction.update(submissionRef, {
        status: 'published',
        moderationNote: note,
        moderatedBy: actor.uid,
        moderatedAt: FieldValue.serverTimestamp(),
        publishedAt: FieldValue.serverTimestamp(),
        filePath: publishedCopyPath,
        fileName: originalName,
        fileSize: uploadedBytes,
        mimeType: 'application/pdf',
        sha256,
        securityStatus: 'signature-verified',
        malwareScanStatus: 'not-configured',
        storageState: 'published',
        moderationLeaseId: FieldValue.delete(),
        moderationLeaseExpiresAt: FieldValue.delete(),
        moderationLeaseBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      transaction.set(
        auditRef,
        adminAuditData({
          actor,
          decision: 'approve',
          submissionId,
          data,
          note,
          publishedCopyPath,
        }),
      )
    })

    moderationFinalized = true

    if (publishedCopyPath !== sourcePath) {
      await getFirebaseAdminBucket()
        .file(sourcePath)
        .delete({ ignoreNotFound: true })
        .catch((error) => {
          console.error(
            'Knowledge quarantine cleanup failed after publish',
            error,
          )
        })
    }

    return NextResponse.json(
      { ok: true, status: 'published' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (!moderationFinalized && publishedCopyPath) {
      await getFirebaseAdminBucket()
        .file(publishedCopyPath)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined)
    }
    if (!moderationFinalized && moderationLeaseId && submissionId) {
      await releaseModerationLease(submissionId, moderationLeaseId).catch(
        (releaseError) => {
          console.error('Knowledge moderation lease cleanup failed', releaseError)
        },
      )
    }

    const response =
      error instanceof AdminAccessError
        ? {
            status: error.status,
            body: { ok: false, code: error.code, error: error.message },
          }
        : moderationErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
