import 'server-only'

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import type { Booking } from '@/lib/domain'

interface CreateLessonTokenInput {
  booking: Booking
  participantUid: string
  participantName: string
  participantRole: 'student' | 'tutor'
}

export type LiveVideoAvailabilityCode =
  'ready' | 'disabled' | 'incomplete' | 'invalid-url' | 'unreachable'

export interface LiveVideoAvailability {
  enabled: boolean
  code: LiveVideoAvailabilityCode
}

let statusCache:
  | {
      expiresAt: number
      value: LiveVideoAvailability
    }
  | undefined

function isEnabledFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export function getLiveVideoAvailability(): LiveVideoAvailability {
  if (!isEnabledFlag(process.env.MEDSTART_LIVE_VIDEO_ENABLED)) {
    return { enabled: false, code: 'disabled' }
  }

  const serverUrl = process.env.LIVEKIT_URL?.trim()
  const apiKey = process.env.LIVEKIT_API_KEY?.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()

  if (!serverUrl || !apiKey || !apiSecret) {
    return { enabled: false, code: 'incomplete' }
  }
  if (!serverUrl.startsWith('wss://')) {
    return { enabled: false, code: 'invalid-url' }
  }

  return { enabled: true, code: 'ready' }
}

export async function checkLiveVideoAvailability(): Promise<LiveVideoAvailability> {
  const availability = getLiveVideoAvailability()
  if (!availability.enabled) return availability
  if (statusCache && statusCache.expiresAt > Date.now()) {
    return statusCache.value
  }

  const serverUrl = process.env.LIVEKIT_URL!.trim()
  const apiKey = process.env.LIVEKIT_API_KEY!.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET!.trim()
  const httpUrl = serverUrl.replace(/^wss:/, 'https:')
  const service = new RoomServiceClient(httpUrl, apiKey, apiSecret)
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      service.listRooms(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('LiveKit health check timed out')),
          3_500,
        )
      }),
    ])
    statusCache = {
      value: availability,
      expiresAt: Date.now() + 30_000,
    }
    return availability
  } catch {
    const unreachable: LiveVideoAvailability = {
      enabled: false,
      code: 'unreachable',
    }
    statusCache = {
      value: unreachable,
      expiresAt: Date.now() + 10_000,
    }
    return unreachable
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function liveKitConfig() {
  const availability = getLiveVideoAvailability()
  if (availability.code === 'disabled') {
    throw new Error('Видеосвязь MedStart пока не активирована.')
  }
  if (availability.code === 'incomplete') {
    throw new Error(
      'Настройка видеосвязи MedStart не завершена: проверьте LIVEKIT_URL, LIVEKIT_API_KEY и LIVEKIT_API_SECRET.',
    )
  }
  if (availability.code === 'invalid-url') {
    throw new Error('LIVEKIT_URL должен начинаться с wss://.')
  }

  const serverUrl = process.env.LIVEKIT_URL!.trim()
  const apiKey = process.env.LIVEKIT_API_KEY!.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET!.trim()

  return { serverUrl, apiKey, apiSecret }
}

export async function createLessonToken(input: CreateLessonTokenInput) {
  const { serverUrl, apiKey, apiSecret } = liveKitConfig()
  const roomName = `medstart_${input.booking.id}`
  const token = new AccessToken(apiKey, apiSecret, {
    identity: input.participantUid,
    name: input.participantName,
    ttl: '4h',
    metadata: JSON.stringify({
      bookingId: input.booking.id,
      role: input.participantRole,
      subject: input.booking.subject,
    }),
    attributes: {
      'medstart.bookingId': input.booking.id,
      'medstart.role': input.participantRole,
    },
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  })

  return {
    mode: 'live' as const,
    serverUrl,
    roomName,
    participantToken: await token.toJwt(),
  }
}
