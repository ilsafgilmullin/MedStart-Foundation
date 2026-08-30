import 'server-only'

function enabled(value: string | undefined) {
  return ['1', 'true', 'yes'].includes(String(value || '').trim().toLowerCase())
}

export function schoolTrackEnabled() {
  return enabled(process.env.MEDSTART_SCHOOL_TRACK_ENABLED)
}
