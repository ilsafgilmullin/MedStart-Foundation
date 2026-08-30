import assert from 'node:assert/strict'
import { isTrustedAvatarUrl } from '../artifacts/medstart/lib/avatar-security.ts'

const bucket = 'medstart-example.firebasestorage.app'
const trustedBase = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/`

assert.equal(
  isTrustedAvatarUrl(`${trustedBase}avatars%2Fuser-1%2Fprofile?alt=media`, bucket),
  true,
)
assert.equal(
  isTrustedAvatarUrl(`${trustedBase}avatars%2fuser-1%2fprofile?alt=media&token=test`, bucket),
  true,
)
assert.equal(
  isTrustedAvatarUrl(`${trustedBase}chat-media%2Froom%2Ffile.png?alt=media`, bucket),
  false,
)
assert.equal(
  isTrustedAvatarUrl('https://example.com/avatar.png', bucket),
  false,
)
assert.equal(
  isTrustedAvatarUrl('http://firebasestorage.googleapis.com/avatar.png', bucket),
  false,
)
assert.equal(
  isTrustedAvatarUrl(
    `https://user:pass@firebasestorage.googleapis.com/v0/b/${bucket}/o/avatars%2Fu%2Fprofile`,
    bucket,
  ),
  false,
)
assert.equal(
  isTrustedAvatarUrl(
    'https://firebasestorage.googleapis.com/v0/b/other.firebasestorage.app/o/avatars%2Fu%2Fprofile',
    bucket,
  ),
  false,
)
assert.equal(isTrustedAvatarUrl('not-a-url', bucket), false)

console.log('Avatar render-origin security tests passed.')
