import { NextResponse } from 'next/server'
import { checkLiveVideoAvailability } from '@/lib/server/livekit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const availability = await checkLiveVideoAvailability()

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
