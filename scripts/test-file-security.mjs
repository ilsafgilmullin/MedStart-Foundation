import assert from 'node:assert/strict'
import {
  buildStoredFileName,
  detectUploadType,
  sanitizeOriginalFileName,
} from '../artifacts/medstart/lib/server/file-security.ts'

const bytes = (...values) => new Uint8Array(values)
const ascii = (value) => new TextEncoder().encode(value)

function concat(...parts) {
  const size = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

assert.deepEqual(detectUploadType(ascii('%PDF-1.7\n'), 'application/pdf'), {
  mime: 'application/pdf',
  extension: 'pdf',
  category: 'file',
  disposition: 'attachment',
})
assert.equal(detectUploadType(ascii('%PDF-1.7\n'), 'image/png'), null)
assert.equal(detectUploadType(concat(ascii('MZ'), bytes(0, 0, 0, 0)), 'application/pdf'), null)

assert.equal(detectUploadType(bytes(0xff, 0xd8, 0xff, 0xe0), 'image/jpeg')?.extension, 'jpg')
assert.equal(detectUploadType(bytes(0xff, 0xd8, 0xff, 0xe0), 'application/pdf'), null)
assert.equal(
  detectUploadType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image/png')
    ?.mime,
  'image/png',
)
assert.equal(
  detectUploadType(concat(ascii('RIFF'), bytes(0, 0, 0, 0), ascii('WEBP')), 'image/webp')
    ?.extension,
  'webp',
)
assert.equal(
  detectUploadType(concat(bytes(0, 0, 0, 24), ascii('ftypheic'), bytes(0, 0, 0, 0)), 'image/heic')
    ?.mime,
  'image/heic',
)

assert.equal(
  detectUploadType(concat(ascii('RIFF'), bytes(0, 0, 0, 0), ascii('WAVE')), 'audio/wav')
    ?.category,
  'audio',
)
assert.equal(detectUploadType(ascii('OggS'), 'audio/ogg')?.extension, 'ogg')
assert.equal(detectUploadType(ascii('ID3test'), 'audio/mpeg')?.extension, 'mp3')
assert.equal(
  detectUploadType(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0), 'video/webm')?.category,
  'video',
)
assert.equal(detectUploadType(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0), ''), null)
assert.equal(
  detectUploadType(concat(bytes(0, 0, 0, 24), ascii('ftypmp42'), bytes(0, 0, 0, 0)), 'video/mp4')
    ?.extension,
  'mp4',
)
assert.equal(
  detectUploadType(concat(bytes(0, 0, 0, 24), ascii('ftypM4A '), bytes(0, 0, 0, 0)), 'audio/x-m4a')
    ?.mime,
  'audio/mp4',
)

assert.equal(sanitizeOriginalFileName('../patient\u0000/report.pdf'), '..-patient-report.pdf')
const stored = buildStoredFileName('../patient record.exe', 'pdf', 'fixed-id', 123)
assert.equal(stored, '123-fixed-id-patient-record.pdf')
assert.equal(stored.includes('/'), false)
assert.equal(stored.endsWith('.exe'), false)

console.log('File security signature tests passed.')
