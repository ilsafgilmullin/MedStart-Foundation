import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import {
  getFirebaseAdminBucket,
  getFirebaseAdminDb,
} from '@/lib/server/firebase-admin'
import {
  KnowledgeAccessError,
  knowledgeErrorResponse,
  requireKnowledgeActor,
  requireTutor,
} from '@/lib/server/knowledge-access'
import {
  canonicalKnowledgePdfName,
  MAX_KNOWLEDGE_PDF_SIZE,
  normalizeKnowledgeSubmissionInput,
  parseKnowledgeStoragePath,
  validateKnowledgeSubmissionId,
} from '@/lib/server/knowledge-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function adminAuditData(input: {
  actor: Awaited<ReturnType<typeof requireKnowledgeActor>>
  action: string
  summary: string
  submissionId: string
  metadata?: Record<string, unknown>
}) {
  return {
    actorUid: input.actor.uid,
    actorName: input.actor.name,
    actorEmail: input.actor.email,
    actorRole: input.actor.role,
    action: input.action.slice(0, 120),
    summary: input.summary.slice(0, 1_000),
    targetUid: input.submissionId,
    targetType: 'knowledgeSubmission',
    metadata: input.metadata || {},
    createdAt: FieldValue.serverTimestamp(),
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireKnowledgeActor(request)
    requireTutor(actor)
    const input = normalizeKnowledgeSubmissionInput(await request.json())
    const db = getFirebaseAdminDb()
    const submissionRef = db.collection('knowledgeSubmissions').doc(input.id)

    let filePath = ''
    let fileName = ''
    let fileSize = 0
    let mimeType = ''
    let sha256 = ''
    let securityStatus = 'link-validated'
    let malwareScanStatus = 'not-applicable'
    let storageState = 'not-applicable'

    if (input.sourceMode === 'file') {
      const parsed = parseKnowledgeStoragePath(input.filePath)
      if (
        parsed.kind !== 'quarantine' ||
        parsed.uploaderUid !== actor.uid ||
        parsed.submissionId !== input.id
      ) {
        throw new KnowledgeAccessError(
          403,
          'KNOWLEDGE_QUARANTINE_PATH_REJECTED',
          'Загруженный файл не принадлежит этой заявке.',
        )
      }

      const object = getFirebaseAdminBucket().file(input.filePath)
      const [exists] = await object.exists()
      if (!exists) {
        throw new KnowledgeAccessError(
          404,
          'KNOWLEDGE_QUARANTINE_FILE_MISSING',
          'Загруженный PDF не найден в карантине.',
        )
      }
      const [metadata] = await object.getMetadata()
      const custom = metadata.metadata || {}
      const actualSize = Number(metadata.size || 0)
      if (
        metadata.contentType !== 'application/pdf' ||
        !actualSize ||
        actualSize > MAX_KNOWLEDGE_PDF_SIZE ||
        custom.submissionId !== input.id ||
        custom.tutorUid !== actor.uid ||
        custom.securityStatus !== 'signature-verified' ||
        custom.storageState !== 'quarantined' ||
        !/^[a-f0-9]{64}$/.test(String(custom.sha256 || ''))
      ) {
        throw new KnowledgeAccessError(
          403,
          'KNOWLEDGE_QUARANTINE_METADATA_REJECTED',
          'Проверка метаданных карантинного PDF не пройдена.',
        )
      }

      filePath = input.filePath
      fileName = canonicalKnowledgePdfName(
        String(custom.originalName || parsed.fileName),
      )
      fileSize = actualSize
      mimeType = 'application/pdf'
      sha256 = String(custom.sha256)
      securityStatus = 'signature-verified'
      malwareScanStatus = String(custom.malwareScanStatus || 'not-configured')
      storageState = 'quarantined'
    }

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(submissionRef)
      if (existing.exists) {
        throw new KnowledgeAccessError(
          409,
          'KNOWLEDGE_SUBMISSION_EXISTS',
          'Материал с таким идентификатором уже существует.',
        )
      }
      transaction.create(submissionRef, {
        origin: 'tutor',
        status: 'pending',
        title: input.title,
        description: input.description,
        kind: input.kind,
        discipline: input.discipline,
        level: input.level,
        author: input.author,
        publicationYear: input.publicationYear,
        sourceMode: input.sourceMode,
        sourceUrl: input.sourceUrl,
        filePath,
        fileName,
        fileSize,
        mimeType,
        sha256,
        securityStatus,
        malwareScanStatus,
        storageState,
        submittedByUid: actor.uid,
        submittedByName: actor.name,
        rightsConfirmed: true,
        medicalConfirmed: true,
        noPatientDataConfirmed: true,
        moderationNote: '',
        moderatedBy: '',
        moderatedAt: null,
        publishedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json(
      { ok: true, id: input.id },
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

export async function DELETE(request: Request) {
  try {
    const actor = await requireKnowledgeActor(request)
    const body = (await request.json()) as { submissionId?: unknown }
    const submissionId = validateKnowledgeSubmissionId(body.submissionId)
    const db = getFirebaseAdminDb()
    const submissionRef = db.collection('knowledgeSubmissions').doc(submissionId)
    const snapshot = await submissionRef.get()
    if (!snapshot.exists) {
      throw new KnowledgeAccessError(
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
      submittedByUid?: string
    }
    const ownDraft =
      actor.role === 'tutor' &&
      data.submittedByUid === actor.uid &&
      (data.status === 'pending' || data.status === 'rejected')
    if (!actor.moderator && !ownDraft) {
      throw new KnowledgeAccessError(
        403,
        'KNOWLEDGE_DELETE_FORBIDDEN',
        'Удалить этот материал нельзя.',
      )
    }

    const batch = db.batch()
    batch.delete(submissionRef)
    if (actor.moderator) {
      batch.set(
        db.collection('adminAuditLogs').doc(),
        adminAuditData({
          actor,
          action: 'delete_knowledge_submission',
          summary: `Удалён учебный материал «${String(data.title || submissionId)}».`,
          submissionId,
          metadata: {
            previousStatus: String(data.status || ''),
            submittedByUid: String(data.submittedByUid || ''),
          },
        }),
      )
    }
    await batch.commit()

    let orphanCleanupRequired = false
    if (data.sourceMode === 'file' && data.filePath) {
      try {
        await getFirebaseAdminBucket()
          .file(data.filePath)
          .delete({ ignoreNotFound: true })
      } catch (error) {
        orphanCleanupRequired = true
        console.error('Knowledge object cleanup failed after document deletion', error)
      }
    }

    return NextResponse.json(
      { ok: true, orphanCleanupRequired },
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
