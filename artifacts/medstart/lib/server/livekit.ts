import 'server-only'

import { AccessToken } from 'livekit-server-sdk'
import type { Booking } from '@/lib/domain'

interface CreateLessonTokenInput {
  booking: Booking
  participantUid: string
  participantName: string
  participantRole: 'student' | 'tutor'
}

function liveKitConfig() {
  const serverUrl = process.env.LIVEKIT_URL?.trim()
  const apiKey = process.env.LIVEKIT_API_KEY?.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()

  if (!serverUrl || !apiKey || !apiSecret) {
    throw new Error('Сервер видеосвязи MedStart ещё не подключён.')
  }
  if (!serverUrl.startsWith('wss://')) {
    throw new Error('LIVEKIT_URL должен начинаться с wss://.')
  }

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
    serverUrl,
    roomName,
    participantToken: await token.toJwt(),
  }
}
