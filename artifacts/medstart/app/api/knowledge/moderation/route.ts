import { createHash } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import {
  AdminAccessError,
  adminErrorResponse,
  requireAdminActor,
} from '@/lib/server/admin-control'
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

export async function POST(request: Request) {
  let publishedCopyPath = ''
  try {
    const actor = await requireAdminActor(request)
    const body = (await request.json()) as {
      submissionId?: unknown
      decision?: unknown
      note?: unknown
    }
    const submissionId = validateKnowledgeSubmissionId(body.submissionId)
    const decision = body.decision === 'approve' || body.decision === 'reject'
      ? body.decision
      : ''
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1_000) : ''
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
    const snapshot = await submissionRef.get()
    if (!snapshot.exists) {
      throw new AdminAccessError(
        404,
        'KNOWLEDGE_NOT_FOUND',
        'Учебный материал не найден.',
      )
    }
    const data = snapshot.data() as {
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
    }
    if (data.status !== 'pending') {
      throw new AdminAccessError(
        409,
        'KNOWLEDGE_NOT_PENDING',
        'Материал уже обработан другим модератором.',
      )
    }

    let fileUpdate: Record<string, unknown> = {}
    let sourcePath = ''
    if (decision === 'approve' && data.sourceMode === 'file') {
      sourcePath = String(data.filePath || '')
      const parsed = parseKnowledgeStoragePath(sourcePath)
      if (parsed.submissionId !== submissionId) {
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

      const custom = metadata.metadata || {}
      let sha256 = String(data.sha256 || custom.sha256 || '')
      let uploadedBytes = size
      if (!/^[a-f0-9]{64}$/.test(sha256) || parsed.kind === 'legacy') {
        const hashed = await hashStorageObject(sourcePath)
        sha256 = hashed.sha256
        uploadedBytes = hashed.bytes
      }
      const originalName = canonicalKnowledgePdfName(
        String(data.fileName || custom.originalName || parsed.fileName),
      )
      publishedCopyPath = `knowledge-published/${submissionId}/${parsed.fileName}`
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
        },
      })
      fileUpdate = {
        filePath: publishedCopyPath,
        fileName: originalName,
        fileSize: uploadedBytes,
        mimeType: 'application/pdf',
        sha256,
        securityStatus: 'signature-verified',
        malwareScanStatus: 'not-configured',
        storageState: 'published',
      }
    }

    const batch = db.batch()
    batch.update(submissionRef, {
      status: decision === 'approve' ? 'published' : 'rejected',
      moderationNote: note,
      moderatedBy: actor.uid,
      moderatedAt: FieldValue.serverTimestamp(),
      publishedAt:
        decision === 'approve' ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
      ...fileUpdate,
    })
    batch.set(db.collection('adminAuditLogs').doc(), {
      actorUid: actor.uid,
      actorName: actor.displayName,
      actorEmail: actor.email,
      actorRole: actor.role,
      action:
        decision === 'approve'
          ? 'approve_knowledge_submission'
          : 'reject_knowledge_submission',
      summary:
        decision === 'approve'
          ? `Опубликован учебный материал «${String(data.title || submissionId)}».`
          : `Отклонён учебный материал «${String(data.title || submissionId)}».`,
      targetUid: submissionId,
      targetType: 'knowledgeSubmission',
      metadata: {
        submittedByUid: String(data.submittedByUid || ''),
        sourceMode: String(data.sourceMode || ''),
        previousFilePath: String(data.filePath || ''),
        publishedFilePath: publishedCopyPath,
        securityStatus:
          decision === 'approve' && data.sourceMode === 'file'
            ? 'signature-verified'
            : 'not-applicable',
        malwareScanStatus:
          decision === 'approve' && data.sourceMode === 'file'
            ? 'not-configured'
            : 'not-applicable',
        moderationNote: note,
      },
      createdAt: FieldValue.serverTimestamp(),
    })

    try {
      await batch.commit()
    } catch (error) {
      if (publishedCopyPath) {
        await getFirebaseAdminBucket()
          .file(publishedCopyPath)
          .delete({ ignoreNotFound: true })
          .catch(() => undefined)
      }
      throw error
    }

    if (publishedCopyPath && sourcePath && publishedCopyPath !== sourcePath) {
      await getFirebaseAdminBucket()
        .file(sourcePath)
        .delete({ ignoreNotFound: true })
        .catch((error) => {
          console.error('Knowledge quarantine cleanup failed after publish', error)
        })
    }

    return NextResponse.json(
      { ok: true, status: decision === 'approve' ? 'published' : 'rejected' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (publishedCopyPath) {
      await getFirebaseAdminBucket()
        .file(publishedCopyPath)
        .delete({ ignoreNotFound: true })
        .catch(() => undefined)
    }
    const response = adminErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
