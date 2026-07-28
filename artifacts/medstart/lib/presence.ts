'use client'

import { auth } from './firebase'

export type PresenceStatus = 'online' | 'recent' | 'offline' | 'hidden'

export interface PresenceSnapshot {
  status: PresenceStatus
  lastActiveAt: number
}

const HEARTBEAT_MS = 55_000
const REFRESH_MS = 60_000
const MAX_BATCH = 60

type PresenceListener = (snapshot: PresenceSnapshot | null) => void

const listeners = new Map<string, Set<PresenceListener>>()
const cache = new Map<string, PresenceSnapshot>()
let refreshTimer: number | null = null
let refreshScheduled = false
let refreshInFlight: Promise<void> | null = null

async function requestPresence(body: Record<string, unknown>) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Требуется авторизация.')
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/presence', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    items?: Record<string, PresenceSnapshot>
    error?: string
  }
  if (!response.ok) throw new Error(payload.error || 'Не удалось обновить статус присутствия.')
  return payload
}

export function startPresenceSession() {
  let stopped = false
  const heartbeat = () => {
    if (stopped || document.visibilityState === 'hidden') return
    void requestPresence({ action: 'heartbeat' }).catch(() => undefined)
  }
  const away = () => {
    if (stopped) return
    void requestPresence({ action: 'away' }).catch(() => undefined)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') heartbeat()
    else away()
  }
  heartbeat()
  const timer = window.setInterval(heartbeat, HEARTBEAT_MS)
  window.addEventListener('focus', heartbeat)
  window.addEventListener('blur', away)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', away)
  return () => {
    stopped = true
    window.clearInterval(timer)
    window.removeEventListener('focus', heartbeat)
    window.removeEventListener('blur', away)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', away)
  }
}

export async function setPresenceVisibility(visibility: 'everyone' | 'hidden') {
  await requestPresence({ action: 'privacy', visibility })
  schedulePresenceRefresh()
}

export async function fetchPresences(uids: string[]) {
  const unique = [...new Set(uids.filter(Boolean))]
  const result: Record<string, PresenceSnapshot> = {}
  for (let index = 0; index < unique.length; index += MAX_BATCH) {
    const chunk = unique.slice(index, index + MAX_BATCH)
    const payload = await requestPresence({ action: 'read', uids: chunk })
    Object.assign(result, payload.items || {})
  }
  return result
}

function notify(uid: string) {
  const snapshot = cache.get(uid) ?? null
  for (const listener of listeners.get(uid) ?? []) listener(snapshot)
}

async function refreshAllPresence() {
  if (refreshInFlight) return refreshInFlight
  const uids = [...listeners.keys()]
  if (!uids.length) return
  refreshInFlight = (async () => {
    try {
      const items = await fetchPresences(uids)
      for (const uid of uids) {
        const next = items[uid] ?? { status: 'offline' as const, lastActiveAt: 0 }
        cache.set(uid, next)
        notify(uid)
      }
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

function ensureRefreshTimer() {
  if (refreshTimer !== null || !listeners.size) return
  refreshTimer = window.setInterval(() => {
    void refreshAllPresence().catch(() => undefined)
  }, REFRESH_MS)
}

function stopRefreshTimerIfIdle() {
  if (listeners.size || refreshTimer === null) return
  window.clearInterval(refreshTimer)
  refreshTimer = null
}

export function schedulePresenceRefresh() {
  if (refreshScheduled) return
  refreshScheduled = true
  window.setTimeout(() => {
    refreshScheduled = false
    void refreshAllPresence().catch(() => undefined)
  }, 40)
}

export function subscribeToPresence(uid: string, listener: PresenceListener) {
  if (!uid) {
    listener(null)
    return () => undefined
  }
  const current = listeners.get(uid) ?? new Set<PresenceListener>()
  current.add(listener)
  listeners.set(uid, current)
  listener(cache.get(uid) ?? null)
  ensureRefreshTimer()
  schedulePresenceRefresh()
  return () => {
    const active = listeners.get(uid)
    active?.delete(listener)
    if (active && active.size === 0) listeners.delete(uid)
    stopRefreshTimerIfIdle()
  }
}

export function subscribeToPresences(
  uids: string[],
  onChange: (items: Record<string, PresenceSnapshot>) => void,
) {
  const unique = [...new Set(uids.filter(Boolean))]
  const values: Record<string, PresenceSnapshot> = {}
  const emit = () => onChange({ ...values })
  const unsubscribers = unique.map((uid) =>
    subscribeToPresence(uid, (snapshot) => {
      if (snapshot) values[uid] = snapshot
      else delete values[uid]
      emit()
    }),
  )
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

export function formatPresence(snapshot?: PresenceSnapshot | null, now = Date.now()) {
  if (!snapshot || snapshot.status === 'hidden') {
    return { label: 'Статус скрыт', tone: 'hidden' as const }
  }
  if (snapshot.status === 'online') {
    return { label: 'В сети · пульс активен', tone: 'online' as const }
  }
  if (!snapshot.lastActiveAt) {
    return { label: 'Давно не заходил(а)', tone: 'offline' as const }
  }
  const minutes = Math.max(1, Math.floor((now - snapshot.lastActiveAt) / 60_000))
  if (minutes < 60) {
    return {
      label: minutes <= 15 ? `Недавно · ${minutes} мин. назад` : `${minutes} мин. назад`,
      tone: 'recent' as const,
    }
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return { label: `Сегодня · ${hours} ч. назад`, tone: 'offline' as const }
  }
  const days = Math.floor(hours / 24)
  if (days === 1) return { label: 'Был(а) вчера', tone: 'offline' as const }
  if (days < 7) return { label: `${days} дн. назад`, tone: 'offline' as const }
  return { label: 'Давно не заходил(а)', tone: 'offline' as const }
}
