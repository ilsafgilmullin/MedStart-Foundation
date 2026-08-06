const ASCII_DECODER = new TextDecoder('ascii')

export type UploadCategory = 'file' | 'audio' | 'video'

export type DetectedUploadType = {
  mime: string
  extension: string
  category: UploadCategory
  disposition: 'attachment' | 'inline'
}

const EMPTY_MIME = new Set(['', 'application/octet-stream'])

function baseMime(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase()
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  if (bytes.length < signature.length) return false
  return signature.every((value, index) => bytes[index] === value)
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  if (bytes.length < start + length) return ''
  return ASCII_DECODER.decode(bytes.subarray(start, start + length))
}

function declaredAs(declaredMime: string, accepted: readonly string[]) {
  const mime = baseMime(declaredMime)
  return EMPTY_MIME.has(mime) || accepted.includes(mime)
}

function isoBmffBrand(bytes: Uint8Array) {
  return ascii(bytes, 4, 4) === 'ftyp' ? ascii(bytes, 8, 4) : ''
}

function isHeifBrand(brand: string) {
  return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)
}

function isIsoMediaBrand(brand: string) {
  return [
    'isom',
    'iso2',
    'iso3',
    'iso4',
    'iso5',
    'iso6',
    'mp41',
    'mp42',
    'avc1',
    'M4A ',
    'M4B ',
    'M4V ',
    'qt  ',
    '3gp4',
    '3gp5',
  ].includes(brand)
}

export function detectUploadType(
  bytes: Uint8Array,
  declaredMimeValue: string,
): DetectedUploadType | null {
  const declaredMime = baseMime(declaredMimeValue)

  if (
    startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) &&
    declaredAs(declaredMime, ['application/pdf'])
  ) {
    return {
      mime: 'application/pdf',
      extension: 'pdf',
      category: 'file',
      disposition: 'attachment',
    }
  }

  if (
    startsWith(bytes, [0xff, 0xd8, 0xff]) &&
    declaredAs(declaredMime, ['image/jpeg', 'image/jpg'])
  ) {
    return {
      mime: 'image/jpeg',
      extension: 'jpg',
      category: 'file',
      disposition: 'attachment',
    }
  }

  if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
    declaredAs(declaredMime, ['image/png'])
  ) {
    return {
      mime: 'image/png',
      extension: 'png',
      category: 'file',
      disposition: 'attachment',
    }
  }

  if (
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 4) === 'WEBP' &&
    declaredAs(declaredMime, ['image/webp'])
  ) {
    return {
      mime: 'image/webp',
      extension: 'webp',
      category: 'file',
      disposition: 'attachment',
    }
  }

  const brand = isoBmffBrand(bytes)
  if (brand && isHeifBrand(brand) && declaredAs(declaredMime, ['image/heic', 'image/heif'])) {
    const heif = declaredMime === 'image/heif'
    return {
      mime: heif ? 'image/heif' : 'image/heic',
      extension: heif ? 'heif' : 'heic',
      category: 'file',
      disposition: 'attachment',
    }
  }

  if (
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 4) === 'WAVE' &&
    declaredAs(declaredMime, ['audio/wav', 'audio/x-wav', 'audio/wave'])
  ) {
    return {
      mime: 'audio/wav',
      extension: 'wav',
      category: 'audio',
      disposition: 'inline',
    }
  }

  if (ascii(bytes, 0, 4) === 'OggS' && declaredAs(declaredMime, ['audio/ogg'])) {
    return {
      mime: 'audio/ogg',
      extension: 'ogg',
      category: 'audio',
      disposition: 'inline',
    }
  }

  const mp3Frame = bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
  if (
    (ascii(bytes, 0, 3) === 'ID3' || mp3Frame) &&
    declaredAs(declaredMime, ['audio/mpeg'])
  ) {
    return {
      mime: 'audio/mpeg',
      extension: 'mp3',
      category: 'audio',
      disposition: 'inline',
    }
  }

  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    if (declaredMime === 'audio/webm') {
      return {
        mime: 'audio/webm',
        extension: 'webm',
        category: 'audio',
        disposition: 'inline',
      }
    }
    if (declaredMime === 'video/webm') {
      return {
        mime: 'video/webm',
        extension: 'webm',
        category: 'video',
        disposition: 'inline',
      }
    }
    return null
  }

  if (brand && isIsoMediaBrand(brand)) {
    if (declaredMime === 'audio/mp4' || declaredMime === 'audio/x-m4a') {
      return {
        mime: 'audio/mp4',
        extension: 'm4a',
        category: 'audio',
        disposition: 'inline',
      }
    }
    if (declaredMime === 'video/mp4') {
      return {
        mime: 'video/mp4',
        extension: 'mp4',
        category: 'video',
        disposition: 'inline',
      }
    }
    if (declaredMime === 'video/quicktime') {
      return {
        mime: 'video/quicktime',
        extension: 'mov',
        category: 'video',
        disposition: 'inline',
      }
    }
  }

  return null
}

export function sanitizeOriginalFileName(value: string) {
  return (
    value
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/[\\/]+/g, '-')
      .trim()
      .slice(0, 240) || 'file'
  )
}

export function buildStoredFileName(
  originalName: string,
  extension: string,
  uniqueId: string,
  timestamp = Date.now(),
) {
  const sanitized = sanitizeOriginalFileName(originalName)
  const stem = sanitized
    .replace(/\.[^.]*$/, '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 80) || 'file'
  return `${timestamp}-${uniqueId}-${stem}.${extension}`
}

export function isAttachmentMime(value: string) {
  return new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ]).has(baseMime(value))
}
