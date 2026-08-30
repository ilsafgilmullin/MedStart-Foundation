import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  moderationErrorResponse,
  requireModerationActor,
} from '@/lib/server/moderation-control'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface TimestampLike {
  toDate?: () => Date
  toMillis?: () => number
  seconds?: number
}

function toIso(value: unknown) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const timestamp = value as TimestampLike
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString()
    if (typeof timestamp.toMillis === 'function') {
      return new Date(timestamp.toMillis()).toISOString()
    }
    if (typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1_000).toISOString()
    }
  }
  return ''
}

function stringList(value: unknown, max = 30) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, max)
    : []
}

export async function GET(request: Request) {
  try {
    const actor = await requireModerationActor(request)
    const db = getFirebaseAdminDb()
    const [tutorsSnapshot, privateSnapshot, knowledgeSnapshot] = await Promise.all([
      db.collection('users').where('role', '==', 'tutor').get(),
      db.collection('tutorPrivateProfiles').get(),
      db.collection('knowledgeSubmissions').where('status', '==', 'pending').get(),
    ])

    const privateByUid = new Map(
      privateSnapshot.docs.map((item) => [
        item.id,
        String(item.data().qualificationReference || '').slice(0, 300),
      ]),
    )

    const tutors = tutorsSnapshot.docs
      .map((item) => {
        const data = item.data()
        const status = String(data.status || 'pending')
        return {
          uid: item.id,
          displayName: String(data.displayName || 'Репетитор').slice(0, 160),
          avatar: String(data.avatar || '').slice(0, 2_000),
          status,
          isPublic: Boolean(data.isPublic),
          specialization: String(data.specialization || '').slice(0, 180),
          subjects: stringList(data.subjects),
          tutorAudiences: stringList(data.tutorAudiences, 2).filter(
            (value) => value === 'medical' || value === 'school',
          ),
          examTypes: stringList(data.examTypes, 2).filter(
            (value) => value === 'oge' || value === 'ege',
          ),
          institution: String(data.institution || '').slice(0, 240),
          experience: String(data.experience || '').slice(0, 120),
          bio: String(data.bio || '').slice(0, 4_000),
          city: String(data.city || '').slice(0, 160),
          moderationNote: String(data.moderationNote || '').slice(0, 1_000),
          qualificationReference: privateByUid.get(item.id) || '',
          updatedAt: toIso(data.updatedAt),
        }
      })
      .filter((item) =>
        ['pending', 'active', 'rejected', 'suspended'].includes(item.status),
      )
      .sort((left, right) => {
        const priority = { pending: 0, suspended: 1, active: 2, rejected: 3 }
        const leftPriority = priority[left.status as keyof typeof priority] ?? 9
        const rightPriority = priority[right.status as keyof typeof priority] ?? 9
        return leftPriority - rightPriority || left.displayName.localeCompare(right.displayName, 'ru')
      })

    const knowledge = knowledgeSnapshot.docs
      .map((item) => {
        const data = item.data()
        return {
          id: item.id,
          title: String(data.title || '').slice(0, 180),
          description: String(data.description || '').slice(0, 4_000),
          kind: String(data.kind || 'article'),
          discipline: String(data.discipline || 'general'),
          level: String(data.level || 'all'),
          author: String(data.author || '').slice(0, 160),
          publicationYear: String(data.publicationYear || '').slice(0, 20),
          sourceMode: data.sourceMode === 'file' ? 'file' : 'link',
          sourceUrl: String(data.sourceUrl || '').slice(0, 2_000),
          filePath: String(data.filePath || '').slice(0, 1_000),
          fileName: String(data.fileName || '').slice(0, 240),
          fileSize: Number(data.fileSize || 0),
          mimeType: String(data.mimeType || '').slice(0, 120),
          securityStatus: String(data.securityStatus || ''),
          malwareScanStatus: String(data.malwareScanStatus || ''),
          storageState: String(data.storageState || ''),
          submittedByUid: String(data.submittedByUid || '').slice(0, 160),
          submittedByName: String(data.submittedByName || '').slice(0, 160),
          rightsConfirmed: data.rightsConfirmed === true,
          medicalConfirmed: data.medicalConfirmed === true,
          noPatientDataConfirmed: data.noPatientDataConfirmed === true,
          createdAt: toIso(data.createdAt),
        }
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

    return NextResponse.json(
      {
        ok: true,
        actor,
        stats: {
          pendingTutors: tutors.filter((item) => item.status === 'pending').length,
          activeTutors: tutors.filter((item) => item.status === 'active').length,
          suspendedTutors: tutors.filter((item) => item.status === 'suspended').length,
          pendingKnowledge: knowledge.length,
        },
        tutors,
        knowledge,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'cache-control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    const failure = moderationErrorResponse(error)
    return NextResponse.json(failure.body, {
      status: failure.status,
      headers: { 'cache-control': 'no-store, max-age=0' },
    })
  }
}
