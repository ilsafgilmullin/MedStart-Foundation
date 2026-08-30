import sharp from 'sharp'

const MAX_AVATAR_DIMENSION = 1024
const MAX_INPUT_PIXELS = 40_000_000

export interface NormalizedAvatarImage {
  bytes: Buffer
  mimeType: 'image/webp'
  width: number
  height: number
}

export async function normalizeAvatarImage(
  input: Buffer | Uint8Array,
): Promise<NormalizedAvatarImage> {
  const { data, info } = await sharp(input, {
    failOn: 'warning',
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .autoOrient()
    .resize({
      width: MAX_AVATAR_DIMENSION,
      height: MAX_AVATAR_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true })

  if (
    info.format !== 'webp' ||
    !info.width ||
    !info.height ||
    info.width > MAX_AVATAR_DIMENSION ||
    info.height > MAX_AVATAR_DIMENSION
  ) {
    throw new Error('AVATAR_NORMALIZATION_FAILED')
  }

  return {
    bytes: data,
    mimeType: 'image/webp',
    width: info.width,
    height: info.height,
  }
}
