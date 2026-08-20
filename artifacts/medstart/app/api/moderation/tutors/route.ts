import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  ModerationAccessError,
  moderationErrorResponse,
  requireModerationActor,
  writeModerationAudit,
} from '@/lib/server/moderation-control'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TutorDecision = 'approve' | 'reject' | 'suspend' | 'reinstate'

type TutorStatus = 'pending' | 'active' | 'rejected' | 'suspended'

interface ActionBody {
  targetUid?: unknown
  decision?: unknown
  note?: unknown
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function decisionOf(value: unknown): TutorDecision | null {
  return value === 'approve' ||
    value === 'reject' ||
    value === 'suspend' ||
    value === 'reinstate'
    ? value
    : null
}

export async function POST(request: Request) {
  try {
    const actor = await requireModerationActor(request)
    let body: ActionBody
    try {
      body = (await request.json()) as ActionBody
    } catch {
      throw new ModerationAccessError(400, 'INVALID_REQUEST', 'Некорректный запрос.')
    }

    const targetUid = text(body.targetUid, 160)
    const decision = decisionOf(body.decision)
    const note = text(body.note, 1_000)
    if (!targetUid || targetUid.includes('/') || !decision) {
      throw new ModerationAccessError(
        400,
        'INVALID_MODERATION_DECISION',
        'Некорректное решение модерации.',
      )
    }
    if ((decision === 'reject' || decision === 'suspend') && note.length < 3) {
      throw new ModerationAccessError(
        400,
        'MODERATION_REASON_REQUIRED',
        'Укажите причину решения.',
      )
    }

    const db = getFirebaseAdminDb()
    const reference = db.collection('users').doc(targetUid)
    let displayName = 'Репетитор'
    let previousStatus: TutorStatus = 'pending'
    let nextStatus: TutorStatus = 'pending'

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference)
      if (!snapshot.exists) {
        throw new ModerationAccessError(
          404,
          'TUTOR_NOT_FOUND',
          'Анкета репетитора не найдена.',
        )
      }
      const profile = snapshot.data() as {
        role?: string
        status?: string
        displayName?: string
      }
      if (profile.role !== 'tutor') {
        throw new ModerationAccessError(
          409,
          'TARGET_NOT_TUTOR',
          'Выбранный профиль не является репетитором.',
        )
      }

      displayName = String(profile.displayName || 'Репетитор').slice(0, 160)
      previousStatus = profile.status as TutorStatus

      if (decision === 'approve') {
        if (profile.status !== 'pending') {
          throw new ModerationAccessError(
            409,
            'TUTOR_STATE_CHANGED',
            'Анкета уже обработана или изменила состояние.',
          )
        }
        nextStatus = 'active'
      } else if (decision === 'reject') {
        if (profile.status !== 'pending') {
          throw new ModerationAccessError(
            409,
            'TUTOR_STATE_CHANGED',
            'Отклонить можно только анкету со статусом «На проверке».',
          )
        }
        nextStatus = 'rejected'
      } else if (decision === 'suspend') {
        if (profile.status !== 'active') {
          throw new ModerationAccessError(
            409,
            'TUTOR_STATE_CHANGED',
            'Приостановить можно только активного репетитора.',
          )
        }
        nextStatus = 'suspended'
      } else {
        if (profile.status !== 'suspended') {
          throw new ModerationAccessError(
            409,
            'TUTOR_STATE_CHANGED',
            'Восстановить можно только приостановленного репетитора.',
          )
        }
        nextStatus = 'active'
      }

      transaction.update(reference, {
        status: nextStatus,
        isPublic: nextStatus === 'active',
        moderationNote:
          nextStatus === 'rejected' || nextStatus === 'suspended' ? note : '',
        moderatedBy: actor.uid,
        moderatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    const action =
      decision === 'approve'
        ? 'tutor_approve'
        : decision === 'reject'
          ? 'tutor_reject'
          : decision === 'suspend'
            ? 'tutor_suspend'
            : 'tutor_reinstate'
    const summary =
      decision === 'approve'
        ? `Анкета репетитора «${displayName}» одобрена.`
        : decision === 'reject'
          ? `Анкета репетитора «${displayName}» отклонена.`
          : decision === 'suspend'
            ? `Публичный доступ репетитора «${displayName}» приостановлен.`
            : `Репетитор «${displayName}» восстановлен в каталоге.`

    await writeModerationAudit({
      actor,
      action,
      summary,
      targetUid,
      targetType: 'user',
      metadata: { decision, note, previousStatus, nextStatus },
    })

    return NextResponse.json(
      { ok: true, message: summary, status: nextStatus },
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
