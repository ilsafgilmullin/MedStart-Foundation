import assert from 'node:assert/strict'
import sharp from 'sharp'
import { normalizeAvatarImage } from '../artifacts/medstart/lib/server/avatar-image.ts'

const source = await sharp({
  create: {
    width: 1800,
    height: 1200,
    channels: 3,
    background: { r: 20, g: 120, b: 180 },
  },
})
  .jpeg()
  .withMetadata({ orientation: 6 })
  .toBuffer()

const normalized = await normalizeAvatarImage(source)
const metadata = await sharp(normalized.bytes).metadata()
assert.equal(normalized.mimeType, 'image/webp')
assert.equal(metadata.format, 'webp')
assert.equal((metadata.width ?? 0) <= 1024, true)
assert.equal((metadata.height ?? 0) <= 1024, true)
assert.equal(metadata.exif, undefined)
assert.equal(metadata.xmp, undefined)
assert.equal(metadata.orientation, undefined)
console.log('Avatar decode/re-encode metadata stripping suite passed.')
