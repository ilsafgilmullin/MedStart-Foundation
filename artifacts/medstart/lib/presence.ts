'use client'

import { auth } from './firebase'

export type PresenceStatus = 'online' | 'recent' | 'offline' | 'hidden'

export interface PresenceSnapshot {
  status: PresenceStatus
  lastActiveAt: number
}

const HEARTBEAT_MS = 55_000
const REFRESH_MS = 60_000

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
}

export async function fetchPresences(uids: string[]) {
  const unique = [...new Set(uids.filter(Boolean))].slice(0, 60)
  if (!unique.length) return {}
  const payload = await requestPresence({ action: 'read', uids: unique })
  return payload.items || {}
}

export function subscribeToPresences(
  uids: string[],
  onChange: (items: Record<string, PresenceSnapshot>) => void,
  onError?: (error: Error) => void,
) {
  let active = true
  const load = async () => {
    try {
      const items = await fetchPresences(uids)
      if (active) onChange(items)
    } catch (error) {
      if (active) onError?.(error instanceof Error ? error : new Error('Ошибка статуса присутствия.'))
    }
  }
  void load()
  const timer = window.setInterval(load, REFRESH_MS)
  return () => {
    active = false
    window.clearInterval(timer)
  }
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
