export function isTrustedAvatarUrl(value: string, storageBucket: string) {
  const url = value.trim()
  const bucket = storageBucket.trim()
  if (!url || !bucket) return false

  try {
    const parsed = new URL(url)
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'firebasestorage.googleapis.com' ||
      parsed.username ||
      parsed.password
    ) {
      return false
    }

    const expectedPrefix = `/v0/b/${encodeURIComponent(bucket)}/o/avatars%2f`
    return parsed.pathname.toLowerCase().startsWith(expectedPrefix.toLowerCase())
  } catch {
    return false
  }
}
