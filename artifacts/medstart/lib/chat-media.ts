import { auth } from './firebase'

export const CHAT_MEDIA_MAX_BYTES = 25 * 1024 * 1024
export const CHAT_FILE_MAX_BYTES = 15 * 1024 * 1024

const SAFE_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

interface MediaApiResponse {
  path?: string
  error?: string
}

async function authorizationToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) throw new Error('Сессия авторизации устарела. Войдите повторно.')
  return user.getIdToken(forceRefresh)
}

function mediaNetworkError(fallback: string) {
  return new Error(`${fallback} Проверьте интернет и повторите действие.`)
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 30_000) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch {
    throw mediaNetworkError('Связь с сервером MedStart прервалась.')
  } finally {
    window.clearTimeout(timer)
  }
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
  const token = await authorizationToken()
  const form = new FormData()
  form.append('conversationId', input.conversationId)
  form.append('file', input.file, input.file.name)

  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/messages/media')
    request.setRequestHeader('Authorization', `Bearer ${token}`)
    request.responseType = 'text'
    request.timeout = 90_000
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      input.onProgress?.(Math.max(1, Math.round((event.loaded / event.total) * 100)))
    }
    request.onerror = () => reject(mediaNetworkError('Сеть прервала защищённую загрузку.'))
    request.ontimeout = () => reject(mediaNetworkError('Сервер не успел принять запись.'))
    request.onabort = () => reject(new Error('Загрузка записи отменена.'))
    request.onload = () => {
      let payload: MediaApiResponse = {}
      try {
        payload = JSON.parse(request.responseText || '{}') as MediaApiResponse
      } catch {
        payload = {}
      }
      if (request.status < 200 || request.status >= 300 || !payload.path) {
        const fallback = request.status === 413
          ? 'Запись слишком большая. Сделайте видеокружок короче и повторите.'
          : 'Сервер не принял медиафайл.'
        reject(new Error(payload.error || fallback))
        return
      }
      input.onProgress?.(100)
      resolve(payload.path)
    }
    request.send(form)
  })
}

export async function deleteChatMedia(path: string) {
  if (!path.startsWith('chat-media/')) return
  const token = await authorizationToken()
  const response = await fetchWithTimeout('/api/messages/media', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  }, 20_000)
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as MediaApiResponse
    throw new Error(payload.error || 'Не удалось удалить незавершённую загрузку.')
  }
}

export async function loadChatMediaBlob(path: string, maxBytes = CHAT_MEDIA_MAX_BYTES) {
  if (!path.startsWith('chat-media/')) {
    throw new Error('Некорректный путь медиафайла.')
  }
  const token = await authorizationToken()
  const response = await fetchWithTimeout(`/api/messages/media?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }, 45_000)
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as MediaApiResponse
    throw new Error(payload.error || 'Защищённый файл недоступен.')
  }
  const length = Number(response.headers.get('content-length') || 0)
  if (length > maxBytes) throw new Error('Файл превышает допустимый размер.')
  const blob = await response.blob()
  if (blob.size > maxBytes) throw new Error('Файл превышает допустимый размер.')
  return blob
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
