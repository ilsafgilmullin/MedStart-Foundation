import {
  deleteObject,
  getBlob,
  ref,
  uploadBytesResumable,
} from 'firebase/storage'
import { storage } from './firebase'

export const CHAT_MEDIA_MAX_BYTES = 25 * 1024 * 1024
export const CHAT_FILE_MAX_BYTES = 15 * 1024 * 1024

const SAFE_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

function safeName(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return (normalized || 'media').slice(-120)
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function validateChatAttachment(file: File) {
  if (!SAFE_FILE_TYPES.has(file.type)) {
    throw new Error('Можно прикрепить PDF, JPEG, PNG, WEBP или HEIC.')
  }
  if (file.size <= 0 || file.size > CHAT_FILE_MAX_BYTES) {
    throw new Error('Размер вложения должен быть не больше 15 МБ.')
  }
}

export function validateRecordedMedia(file: File, kind: 'voice' | 'video_note') {
  const validType =
    kind === 'voice'
      ? file.type.startsWith('audio/')
      : file.type.startsWith('video/')
  if (!validType) throw new Error('Браузер создал неподдерживаемый формат записи.')
  if (file.size <= 0 || file.size > CHAT_MEDIA_MAX_BYTES) {
    throw new Error('Запись превышает допустимый размер 25 МБ.')
  }
}

export async function uploadChatMedia(input: {
  conversationId: string
  uploaderUid: string
  file: File
  onProgress?: (percent: number) => void
}): Promise<string> {
  const fileName = `${Date.now()}-${randomId()}-${safeName(input.file.name)}`
  const path = `chat-media/${input.conversationId}/${input.uploaderUid}/${fileName}`
  const target = ref(storage, path)

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(target, input.file, {
      contentType: input.file.type,
      customMetadata: {
        conversationId: input.conversationId,
        uploaderUid: input.uploaderUid,
      },
    })
    task.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || 1
        input.onProgress?.(Math.round((snapshot.bytesTransferred / total) * 100))
      },
      reject,
      resolve,
    )
  })

  return path
}

export async function deleteChatMedia(path: string) {
  if (!path.startsWith('chat-media/')) return
  await deleteObject(ref(storage, path))
}

export async function loadChatMediaBlob(path: string, maxBytes = CHAT_MEDIA_MAX_BYTES) {
  if (!path.startsWith('chat-media/')) {
    throw new Error('Некорректный путь медиафайла.')
  }
  return getBlob(ref(storage, path), maxBytes)
}

export async function downloadChatMedia(path: string, fileName: string) {
  const blob = await loadChatMediaBlob(path)
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName || 'medstart-file'
    anchor.rel = 'noopener'
    anchor.click()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}
