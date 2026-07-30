import type { UserRecord } from 'firebase-admin/auth'
import { NextResponse } from 'next/server'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'
import {
  adminErrorResponse,
  requireAdminActor,
} from '@/lib/server/admin-control'
import {
  getFirebaseAdminAuth,
  getFirebaseAdminDb,
  getFirebaseAdminProjectId,
} from '@/lib/server/firebase-admin'

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
    if (typeof timestamp.toDate === 'function')
      return timestamp.toDate().toISOString()
    if (typeof timestamp.toMillis === 'function')
      return new Date(timestamp.toMillis()).toISOString()
    if (typeof timestamp.seconds === 'number')
      return new Date(timestamp.seconds * 1_000).toISOString()
  }
  return ''
}

async function listAllAuthUsers() {
  const auth = getFirebaseAdminAuth()
  const result: UserRecord[] = []
  let pageToken: string | undefined
  do {
    const page = await auth.listUsers(1_000, pageToken)
    result.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken && result.length < 10_000)
  return result
}

export async function GET(request: Request) {
  try {
    const actor = await requireAdminActor(request)
    const db = getFirebaseAdminDb()

    const [
      usersSnapshot,
      privateSnapshot,
      bookingsSnapshot,
      materialsSnapshot,
      knowledgeSnapshot,
      conversationsSnapshot,
      auditSnapshot,
      authUsers,
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('tutorPrivateProfiles').get(),
      db.collection('bookings').get(),
      db.collection('materials').get(),
      db.collection('knowledgeSubmissions').get(),
      db.collection('conversations').get(),
      db
        .collection('adminAuditLogs')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get(),
      listAllAuthUsers(),
    ])

    const authByUid = new Map(authUsers.map((item) => [item.uid, item]))
    const privateByUid = new Map(
      privateSnapshot.docs.map((item) => [
        item.id,
        String(item.data().qualificationReference || ''),
      ]),
    )

    const users = usersSnapshot.docs
      .map((item) => {
        const data = item.data()
        const authUser = authByUid.get(item.id)
        return {
          uid: item.id,
          firstName: String(data.firstName || ''),
          lastName: String(data.lastName || ''),
          displayName: String(data.displayName || data.email || 'Пользователь'),
          email: String(data.email || authUser?.email || ''),
          avatar: String(data.avatar || ''),
          role:
            item.id === PRIMARY_OWNER_UID
              ? 'owner'
              : String(data.role || 'student'),
          profileRole: String(data.role || 'student'),
          status: String(data.status || 'pending'),
          statusBeforeBlock: String(data.statusBeforeBlock || ''),
          specialization: String(data.specialization || ''),
          subjects: Array.isArray(data.subjects)
            ? data.subjects.filter(
                (item): item is string => typeof item === 'string',
              )
            : [],
          tutorAudiences: Array.isArray(data.tutorAudiences)
            ? data.tutorAudiences.filter(
                (item): item is 'medical' | 'school' =>
                  item === 'medical' || item === 'school',
              )
            : ['medical'],
          examTypes: Array.isArray(data.examTypes)
            ? data.examTypes.filter(
                (item): item is 'oge' | 'ege' =>
                  item === 'oge' || item === 'ege',
              )
            : [],
          institution: String(data.institution || ''),
          city: String(data.city || ''),
          isPublic: Boolean(data.isPublic),
          moderationNote: String(data.moderationNote || ''),
          qualificationReference: privateByUid.get(item.id) || '',
          createdAt: toIso(data.createdAt),
          updatedAt: toIso(data.updatedAt),
          auth: {
            exists: Boolean(authUser),
            disabled: Boolean(authUser?.disabled),
            emailVerified: Boolean(authUser?.emailVerified),
            createdAt: authUser?.metadata.creationTime || '',
            lastSignInAt: authUser?.metadata.lastSignInTime || '',
          },
        }
      })
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, 'ru'),
      )

    const bookings = bookingsSnapshot.docs
      .map((item) => {
        const data = item.data()
        return {
          id: item.id,
          studentUid: String(data.studentUid || ''),
          studentName: String(data.studentName || 'Студент'),
          tutorUid: String(data.tutorUid || ''),
          tutorName: String(data.tutorName || 'Репетитор'),
          subject: String(data.subject || ''),
          requestedDate: String(data.requestedDate || ''),
          requestedTime: String(data.requestedTime || ''),
          timezone: String(data.timezone || 'Europe/Moscow'),
          format: String(data.format || 'online'),
          price: Number(data.price || 0),
          status: String(data.status || 'pending'),
          createdAt: toIso(data.createdAt),
          updatedAt: toIso(data.updatedAt),
        }
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 250)

    const audit = auditSnapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        actorUid: String(data.actorUid || ''),
        actorName: String(data.actorName || 'Администратор'),
        actorEmail: String(data.actorEmail || ''),
        actorRole: data.actorRole === 'owner' ? 'owner' : 'admin',
        action: String(data.action || ''),
        summary: String(data.summary || ''),
        targetUid: String(data.targetUid || ''),
        targetType: String(data.targetType || ''),
        metadata:
          data.metadata && typeof data.metadata === 'object'
            ? data.metadata
            : {},
        createdAt: toIso(data.createdAt),
      }
    })

    const knowledge = knowledgeSnapshot.docs.map((item) => item.data())
    const pendingTutors = users.filter(
      (item) => item.profileRole === 'tutor' && item.status === 'pending',
    )
    const activeBookings = bookings.filter((item) =>
      ['pending', 'accepted'].includes(item.status),
    ).length

    const ownerAuth = authByUid.has(PRIMARY_OWNER_UID)
    const ownerProfile = usersSnapshot.docs.some(
      (item) => item.id === PRIMARY_OWNER_UID,
    )

    return NextResponse.json(
      {
        ok: true,
        actor,
        capabilities: {
          ownerControl: actor.role === 'owner',
          manageRoles: actor.role === 'owner',
          archiveUsers: actor.role === 'owner',
          verifyEmails: actor.role === 'owner',
          manageBookings: actor.role === 'owner',
          viewAudit: actor.role === 'owner',
        },
        stats: {
          totalUsers: users.length,
          activeStudents: users.filter(
            (item) =>
              item.profileRole === 'student' &&
              item.status === 'active' &&
              item.uid !== PRIMARY_OWNER_UID,
          ).length,
          activeTutors: users.filter(
            (item) =>
              item.profileRole === 'tutor' &&
              item.status === 'active' &&
              item.isPublic,
          ).length,
          pendingTutors: pendingTutors.length,
          rejectedTutors: users.filter(
            (item) =>
              item.profileRole === 'tutor' && item.status === 'rejected',
          ).length,
          blockedUsers: users.filter((item) => item.status === 'blocked')
            .length,
          archivedUsers: users.filter((item) => item.status === 'deleted')
            .length,
          admins: users.filter((item) => item.profileRole === 'admin').length,
          totalBookings: bookingsSnapshot.size,
          activeBookings,
          completedBookings: bookings.filter(
            (item) => item.status === 'completed',
          ).length,
          totalMaterials: materialsSnapshot.size,
          pendingKnowledge: knowledge.filter(
            (item) => item.status === 'pending',
          ).length,
          conversations: conversationsSnapshot.size,
        },
        users,
        pendingTutors,
        bookings,
        audit: actor.role === 'owner' ? audit : [],
        system: {
          projectId: getFirebaseAdminProjectId(),
          firebaseAdmin: true,
          ownerAuth,
          ownerProfile,
          ownerProtected: ownerAuth && ownerProfile,
          generatedAt: new Date().toISOString(),
        },
      },
      { headers: { 'cache-control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    const failure = adminErrorResponse(error)
    return NextResponse.json(failure.body, {
      status: failure.status,
      headers: { 'cache-control': 'no-store, max-age=0' },
    })
  }
}
