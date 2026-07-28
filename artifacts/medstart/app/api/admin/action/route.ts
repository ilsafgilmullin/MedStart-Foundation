import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { PRIMARY_OWNER_UID } from '@/lib/access-control'
import {
  adminErrorResponse,
  assertTargetIsNotOwner,
  requireAdminActor,
  requireOwner,
  writeAdminAudit,
  type AdminActor,
} from '@/lib/server/admin-control'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import { firebaseIdentityRequest } from '@/lib/server/firebase-identity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UserRole = 'student' | 'tutor' | 'admin'
type UserStatus = 'pending' | 'active' | 'rejected' | 'blocked' | 'deleted'
type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'

type ActionName =
  | 'moderate_tutor'
  | 'set_blocked'
  | 'set_role'
  | 'revoke_sessions'
  | 'send_password_reset'
  | 'verify_email'
  | 'archive_user'
  | 'restore_user'
  | 'set_booking_status'

interface ActionBody {
  action?: unknown
  targetUid?: unknown
  bookingId?: unknown
  decision?: unknown
  note?: unknown
  blocked?: unknown
  role?: unknown
  status?: unknown
}

interface ProfileData {
  uid?: string
  displayName?: string
  email?: string
  role?: UserRole
  status?: UserStatus
  statusBeforeBlock?: UserStatus | ''
  isPublic?: boolean
}

const validRoles = new Set<UserRole>(['student', 'tutor', 'admin'])
const validBookingStatuses = new Set<BookingStatus>([
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'completed',
])

function text(value: unknown, max = 2_000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function targetProfile(targetUid: string) {
  const db = getFirebaseAdminDb()
  const reference = db.collection('users').doc(targetUid)
  const snapshot = await reference.get()
  if (!snapshot.exists) throw new Error('Пользователь не найден.')
  return { reference, data: snapshot.data() as ProfileData }
}

function ensureAdminCanManageTarget(actor: AdminActor, targetUid: string, target: ProfileData) {
  assertTargetIsNotOwner(targetUid)
  if (actor.role === 'owner') return
  if (targetUid === actor.uid || target.role === 'admin') {
    throw new Error('Администратор не может изменять другого администратора или собственный доступ.')
  }
}

async function moderateTutor(actor: AdminActor, body: ActionBody) {
  const targetUid = text(body.targetUid, 160)
  const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null
  const note = text(body.note, 1_000)
  if (!targetUid || !decision) throw new Error('Некорректное решение модерации.')
  if (decision === 'reject' && note.length < 3) throw new Error('Укажите причину отклонения.')

  const db = getFirebaseAdminDb()
  const targetRef = db.collection('users').doc(targetUid)
  let displayName = 'Репетитор'
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(targetRef)
    if (!snapshot.exists) throw new Error('Анкета репетитора не найдена.')
    const profile = snapshot.data() as ProfileData
    ensureAdminCanManageTarget(actor, targetUid, profile)
    if (profile.role !== 'tutor') throw new Error('Выбранный профиль не является репетитором.')
    if (profile.status !== 'pending') throw new Error('Анкета уже обработана.')
    displayName = profile.displayName || 'Репетитор'
    transaction.update(targetRef, {
      status: decision === 'approve' ? 'active' : 'rejected',
      isPublic: decision === 'approve',
      moderationNote: decision === 'reject' ? note : '',
      moderatedBy: actor.uid,
      moderatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  await writeAdminAudit({
    actor,
    action: `tutor_${decision}`,
    summary:
      decision === 'approve'
        ? `Анкета репетитора «${displayName}» одобрена.`
        : `Анкета репетитора «${displayName}» отклонена.`,
    targetUid,
    targetType: 'user',
    metadata: { decision, note },
  })
  return decision === 'approve' ? 'Репетитор опубликован в каталоге.' : 'Анкета отклонена.'
}

async function setBlocked(actor: AdminActor, body: ActionBody) {
  const targetUid = text(body.targetUid, 160)
  const blocked = body.blocked === true
  if (!targetUid) throw new Error('Пользователь не выбран.')

  const auth = getFirebaseAdminAuth()
  const db = getFirebaseAdminDb()
  const { reference, data } = await targetProfile(targetUid)
  ensureAdminCanManageTarget(actor, targetUid, data)
  if (data.status === 'deleted') throw new Error('Архивный аккаунт сначала необходимо восстановить.')

  const authUser = await auth.getUser(targetUid)
  const previousDisabled = authUser.disabled
  await auth.updateUser(targetUid, { disabled: blocked })
  if (blocked) await auth.revokeRefreshTokens(targetUid)

  try {
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(reference)
      if (!current.exists) throw new Error('Пользователь не найден.')
      const profile = current.data() as ProfileData
      if (blocked) {
        if (profile.status === 'blocked') throw new Error('Аккаунт уже заблокирован.')
        transaction.update(reference, {
          statusBeforeBlock: profile.status || 'active',
          status: 'blocked',
          isPublic: false,
          updatedAt: FieldValue.serverTimestamp(),
        })
      } else {
        if (profile.status !== 'blocked') throw new Error('Аккаунт не заблокирован.')
        const restored: UserStatus =
          profile.statusBeforeBlock && ['active', 'pending', 'rejected'].includes(profile.statusBeforeBlock)
            ? profile.statusBeforeBlock
            : profile.role === 'tutor'
              ? 'pending'
              : 'active'
        transaction.update(reference, {
          status: restored,
          statusBeforeBlock: '',
          isPublic: profile.role === 'tutor' && restored === 'active',
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    })
  } catch (error) {
    await auth.updateUser(targetUid, { disabled: previousDisabled }).catch(() => undefined)
    throw error
  }

  await writeAdminAudit({
    actor,
    action: blocked ? 'user_blocked' : 'user_unblocked',
    summary: blocked
      ? `Доступ пользователя «${data.displayName || data.email || targetUid}» заблокирован.`
      : `Доступ пользователя «${data.displayName || data.email || targetUid}» восстановлен.`,
    targetUid,
    targetType: 'user',
    metadata: { previousStatus: data.status },
  })
  return blocked ? 'Пользователь заблокирован, активные сессии отозваны.' : 'Доступ пользователя восстановлен.'
}

async function setRole(actor: AdminActor, body: ActionBody) {
  requireOwner(actor)
  const targetUid = text(body.targetUid, 160)
  const nextRole = validRoles.has(body.role as UserRole) ? (body.role as UserRole) : null
  if (!targetUid || !nextRole) throw new Error('Выберите корректную роль.')
  assertTargetIsNotOwner(targetUid)

  const db = getFirebaseAdminDb()
  const { reference, data } = await targetProfile(targetUid)
  if (data.status === 'blocked' || data.status === 'deleted') {
    throw new Error('Сначала восстановите активный доступ пользователя.')
  }
  const nextStatus: UserStatus = nextRole === 'tutor' ? 'pending' : 'active'
  await reference.update({
    role: nextRole,
    status: nextStatus,
    statusBeforeBlock: '',
    isPublic: false,
    moderationNote: nextRole === 'tutor' ? 'Назначен владельцем. Требуется проверка анкеты.' : '',
    moderatedBy: '',
    moderatedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await writeAdminAudit({
    actor,
    action: 'user_role_changed',
    summary: `Роль пользователя «${data.displayName || data.email || targetUid}» изменена: ${data.role || 'не указана'} → ${nextRole}.`,
    targetUid,
    targetType: 'user',
    metadata: { previousRole: data.role, nextRole, nextStatus },
  })
  return 'Роль пользователя обновлена.'
}

async function revokeSessions(actor: AdminActor, body: ActionBody) {
  const targetUid = text(body.targetUid, 160)
  if (!targetUid) throw new Error('Пользователь не выбран.')
  const { data } = await targetProfile(targetUid)
  ensureAdminCanManageTarget(actor, targetUid, data)
  await getFirebaseAdminAuth().revokeRefreshTokens(targetUid)
  await writeAdminAudit({
    actor,
    action: 'sessions_revoked',
    summary: `Все активные сессии пользователя «${data.displayName || data.email || targetUid}» отозваны.`,
    targetUid,
    targetType: 'user',
  })
  return 'Активные сессии пользователя отозваны.'
}

async function sendPasswordReset(actor: AdminActor, body: ActionBody) {
  const targetUid = text(body.targetUid, 160)
  if (!targetUid) throw new Error('Пользователь не выбран.')
  const { data } = await targetProfile(targetUid)
  ensureAdminCanManageTarget(actor, targetUid, data)
  const email = text(data.email, 320)
  if (!email) throw new Error('У пользователя отсутствует электронная почта.')
  const reset = await firebaseIdentityRequest('sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email,
  })
  if (!reset.response.ok) throw new Error('Firebase не принял запрос восстановления пароля.')
  await writeAdminAudit({
    actor,
    action: 'password_reset_sent',
    summary: `Пользователю «${data.displayName || email}» отправлено письмо восстановления пароля.`,
    targetUid,
    targetType: 'user',
  })
  return 'Письмо восстановления пароля отправлено.'
}

async function verifyEmail(actor: AdminActor, body: ActionBody) {
  requireOwner(actor)
  const targetUid = text(body.targetUid, 160)
  if (!targetUid) throw new Error('Пользователь не выбран.')
  assertTargetIsNotOwner(targetUid)
  const { data } = await targetProfile(targetUid)
  await getFirebaseAdminAuth().updateUser(targetUid, { emailVerified: true })
  await writeAdminAudit({
    actor,
    action: 'email_verified_by_owner',
    summary: `Владелец подтвердил почту пользователя «${data.displayName || data.email || targetUid}».`,
    targetUid,
    targetType: 'user',
  })
  return 'Электронная почта отмечена как подтверждённая.'
}

async function archiveUser(actor: AdminActor, body: ActionBody) {
  requireOwner(actor)
  const targetUid = text(body.targetUid, 160)
  if (!targetUid) throw new Error('Пользователь не выбран.')
  assertTargetIsNotOwner(targetUid)
  const auth = getFirebaseAdminAuth()
  const { reference, data } = await targetProfile(targetUid)
  if (data.status === 'deleted') throw new Error('Аккаунт уже находится в архиве.')
  const authUser = await auth.getUser(targetUid)
  await auth.updateUser(targetUid, { disabled: true })
  await auth.revokeRefreshTokens(targetUid)
  try {
    await reference.update({
      statusBeforeBlock: data.status || 'active',
      status: 'deleted',
      isPublic: false,
      updatedAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    await auth.updateUser(targetUid, { disabled: authUser.disabled }).catch(() => undefined)
    throw error
  }
  await writeAdminAudit({
    actor,
    action: 'user_archived',
    summary: `Аккаунт «${data.displayName || data.email || targetUid}» архивирован.`,
    targetUid,
    targetType: 'user',
    metadata: { previousStatus: data.status },
  })
  return 'Аккаунт архивирован и отключён в Firebase Authentication.'
}

async function restoreUser(actor: AdminActor, body: ActionBody) {
  requireOwner(actor)
  const targetUid = text(body.targetUid, 160)
  if (!targetUid) throw new Error('Пользователь не выбран.')
  assertTargetIsNotOwner(targetUid)
  const auth = getFirebaseAdminAuth()
  const { reference, data } = await targetProfile(targetUid)
  if (data.status !== 'deleted') throw new Error('Аккаунт не находится в архиве.')
  const restored: UserStatus = data.role === 'tutor' ? 'pending' : 'active'
  await auth.updateUser(targetUid, { disabled: false })
  await reference.update({
    status: restored,
    statusBeforeBlock: '',
    isPublic: false,
    moderationNote: data.role === 'tutor' ? 'Аккаунт восстановлен владельцем. Требуется повторная проверка.' : '',
    updatedAt: FieldValue.serverTimestamp(),
  })
  await writeAdminAudit({
    actor,
    action: 'user_restored',
    summary: `Аккаунт «${data.displayName || data.email || targetUid}» восстановлен из архива.`,
    targetUid,
    targetType: 'user',
    metadata: { restoredStatus: restored },
  })
  return 'Аккаунт восстановлен. Репетитор при необходимости отправлен на повторную проверку.'
}

async function setBookingStatus(actor: AdminActor, body: ActionBody) {
  requireOwner(actor)
  const bookingId = text(body.bookingId, 200)
  const nextStatus = validBookingStatuses.has(body.status as BookingStatus)
    ? (body.status as BookingStatus)
    : null
  if (!bookingId || !nextStatus) throw new Error('Выберите занятие и корректный статус.')

  const db = getFirebaseAdminDb()
  const reference = db.collection('bookings').doc(bookingId)
  const snapshot = await reference.get()
  if (!snapshot.exists) throw new Error('Занятие не найдено.')
  const data = snapshot.data() as Record<string, unknown>
  const patch: Record<string, unknown> = {
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
    adminUpdatedBy: actor.uid,
  }
  if (nextStatus === 'accepted') patch.confirmedAt = FieldValue.serverTimestamp()
  if (nextStatus === 'completed') patch.completedAt = FieldValue.serverTimestamp()
  await reference.update(patch)
  await writeAdminAudit({
    actor,
    action: 'booking_status_changed',
    summary: `Статус занятия «${String(data.subject || bookingId)}» изменён: ${String(data.status || 'не указан')} → ${nextStatus}.`,
    targetUid: bookingId,
    targetType: 'booking',
    metadata: {
      previousStatus: data.status,
      nextStatus,
      studentUid: data.studentUid,
      tutorUid: data.tutorUid,
    },
  })
  return 'Статус занятия обновлён владельцем.'
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminActor(request)
    let body: ActionBody
    try {
      body = (await request.json()) as ActionBody
    } catch {
      throw new Error('Некорректный запрос.')
    }
    const action = text(body.action, 120) as ActionName

    let message: string
    switch (action) {
      case 'moderate_tutor':
        message = await moderateTutor(actor, body)
        break
      case 'set_blocked':
        message = await setBlocked(actor, body)
        break
      case 'set_role':
        message = await setRole(actor, body)
        break
      case 'revoke_sessions':
        message = await revokeSessions(actor, body)
        break
      case 'send_password_reset':
        message = await sendPasswordReset(actor, body)
        break
      case 'verify_email':
        message = await verifyEmail(actor, body)
        break
      case 'archive_user':
        message = await archiveUser(actor, body)
        break
      case 'restore_user':
        message = await restoreUser(actor, body)
        break
      case 'set_booking_status':
        message = await setBookingStatus(actor, body)
        break
      default:
        throw new Error('Неизвестное административное действие.')
    }

    return NextResponse.json(
      { ok: true, message },
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
