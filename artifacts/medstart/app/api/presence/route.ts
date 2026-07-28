import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/server/firebase-admin'
import {
  messageErrorResponse,
  requireMessageActor,
} from '@/lib/server/message-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_UIDS = 60
const ONLINE_WINDOW_MS = 2 * 60 * 1000
const RECENT_WINDOW_MS = 15 * 60 * 1000

function cleanUids(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && /^[A-Za-z0-9:_-]{1,180}$/.test(item)))].slice(0, MAX_UIDS)
}

function statusFor(lastActiveMs: number, state: string) {
  const ageMs = Math.max(0, Date.now() - lastActiveMs)
  if (state === 'online' && ageMs <= ONLINE_WINDOW_MS) return 'online'
  if (ageMs <= RECENT_WINDOW_MS) return 'recent'
  return 'offline'
}

export async function POST(request: Request) {
  try {
    const actor = await requireMessageActor(request)
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown
      state?: unknown
      visibility?: unknown
      uids?: unknown
    }
    const action = typeof body.action === 'string' ? body.action : 'heartbeat'
    const db = getFirebaseAdminDb()

    if (action === 'heartbeat' || action === 'away' || action === 'privacy') {
      const reference = db.collection('presence').doc(actor.uid)
      const patch: Record<string, unknown> = {
        uid: actor.uid,
        state: action === 'away' ? 'away' : 'online',
        lastActiveAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }
      if (action === 'privacy') {
        patch.visibility = body.visibility === 'hidden' ? 'hidden' : 'everyone'
      }
      await reference.set(patch, { merge: true })
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (action !== 'read') {
      return NextResponse.json({ ok: false, error: 'Неизвестная операция присутствия.' }, { status: 400 })
    }

    const uids = cleanUids(body.uids)
    if (!uids.length) return NextResponse.json({ ok: true, items: {} })

    const snapshots = await db.getAll(...uids.map((uid) => db.collection('presence').doc(uid)))
    const items: Record<string, { status: 'online' | 'recent' | 'offline' | 'hidden'; lastActiveAt: number }> = {}
    for (const snapshot of snapshots) {
      const data = snapshot.data() as { state?: string; visibility?: string; lastActiveAt?: Timestamp } | undefined
      if (!data || data.visibility === 'hidden') {
        items[snapshot.id] = { status: 'hidden', lastActiveAt: 0 }
        continue
      }
      const lastActiveAt = data.lastActiveAt instanceof Timestamp ? data.lastActiveAt.toMillis() : 0
      items[snapshot.id] = {
        status: lastActiveAt ? statusFor(lastActiveAt, String(data.state || 'away')) : 'offline',
        lastActiveAt,
      }
    }

    return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const response = messageErrorResponse(error)
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
