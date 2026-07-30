import 'server-only'

import { AccessToken } from 'livekit-server-sdk'
import type { Booking } from '@/lib/domain'

interface CreateLessonTokenInput {
  booking: Booking
  participantUid: string
  participantName: string
  participantRole: 'student' | 'tutor'
}

export type LiveVideoAvailabilityCode =
  'ready' | 'disabled' | 'incomplete' | 'invalid-url'

export interface LiveVideoAvailability {
  enabled: boolean
  code: LiveVideoAvailabilityCode
}

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
    ttl: '3h',
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
