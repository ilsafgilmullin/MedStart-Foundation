'use client'

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase-storage'

const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const MAX_IMAGE_EDGE = 2400
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface ClinicalImageUploadResult {
  url: string
  width: number
  height: number
  storagePath: string
  maskApplied: boolean
}

interface UploadClinicalImageInput {
  file: File
  bookingId: string
  userUid: string
  maskHeader: boolean
}

function safeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Этот браузер не поддерживает безопасную обработку снимка.')
  }
  return createImageBitmap(file)
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Не удалось подготовить обезличенную копию снимка.'))
      },
      'image/webp',
      0.9,
    )
  })
}

/**
 * The original file is never uploaded. The browser decodes pixels, draws them
 * onto a clean canvas and uploads a new WebP file. EXIF and other container
 * metadata are therefore discarded. Optional header masking covers the area
 * where patient identifiers are commonly burned into exported screenshots.
 */
export async function sanitizeAndUploadClinicalImage({
  file,
  bookingId,
  userUid,
  maskHeader,
}: UploadClinicalImageInput): Promise<ClinicalImageUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      'Загрузите PNG, JPEG или WebP. Исходные DICOM-файлы пока не принимаются: сначала экспортируйте обезличенный кадр из диагностического просмотрщика.',
    )
  }
  if (!file.size || file.size > MAX_SOURCE_BYTES) {
    throw new Error('Размер исходного изображения должен быть от 1 байта до 25 МБ.')
  }

  const bitmap = await decodeImage(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Не удалось открыть графический контекст.')

    context.fillStyle = '#000000'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    if (maskHeader) {
      const maskHeight = Math.max(36, Math.round(height * 0.14))
      context.fillStyle = '#000000'
      context.fillRect(0, 0, width, maskHeight)
      context.fillStyle = '#ffffff'
      context.font = `${Math.max(12, Math.round(width / 70))}px ui-sans-serif, system-ui, sans-serif`
      context.fillText('IDENTIFIERS MASKED · MEDSTART', 12, Math.max(24, maskHeight - 12))
    }

    const sanitized = await canvasToBlob(canvas)
    const storagePath = `lesson-assets/${bookingId}/${userUid}/${safeId()}.webp`
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, sanitized, {
      contentType: 'image/webp',
      cacheControl: 'private,max-age=3600',
      customMetadata: {
        deidentifiedCopy: 'true',
        maskApplied: String(maskHeader),
      },
    })

    return {
      url: await getDownloadURL(storageRef),
      width,
      height,
      storagePath,
      maskApplied: maskHeader,
    }
  } finally {
    bitmap.close()
  }
}
