import { NextResponse } from 'next/server'
import { getLiveVideoAvailability } from '@/lib/server/livekit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET() {
  const availability = getLiveVideoAvailability()

  return NextResponse.json(
    {
      videoEnabled: availability.enabled,
      mode: availability.enabled ? 'live' : 'workspace',
      reason: availability.code,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
