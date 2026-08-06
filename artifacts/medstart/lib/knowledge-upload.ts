import { auth } from './firebase'

export const MAX_KNOWLEDGE_PDF_SIZE = 25 * 1024 * 1024

interface KnowledgeFileResponse {
  ok?: boolean
  filePath?: string
  fileName?: string
  error?: string
}

async function authorizationToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) throw new Error('Сессия авторизации устарела. Войдите повторно.')
  return user.getIdToken(forceRefresh)
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 90_000,
) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch {
    throw new Error('Связь с сервером MedStart прервалась. Проверьте интернет.')
  } finally {
    window.clearTimeout(timer)
  }
}

export async function validateKnowledgePdf(file: File): Promise<void> {
  if (
    file.type !== 'application/pdf' ||
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    throw new Error('На первом этапе принимаются только PDF-файлы.')
  }
  if (file.size <= 0 || file.size > MAX_KNOWLEDGE_PDF_SIZE) {
    throw new Error('Размер PDF не должен превышать 25 МБ.')
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  const signature = String.fromCharCode(...header)
  if (signature !== '%PDF-') {
    throw new Error('Файл не прошёл предварительную проверку формата PDF.')
  }
}

export async function uploadKnowledgePdf(
  _tutorUid: string,
  submissionId: string,
  file: File,
): Promise<{ filePath: string; fileName: string }> {
  await validateKnowledgePdf(file)
  const token = await authorizationToken()
  const form = new FormData()
  form.append('submissionId', submissionId)
  form.append('file', file, file.name)

  const response = await fetchWithTimeout('/api/knowledge/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const payload = (await response.json().catch(() => ({}))) as KnowledgeFileResponse
  if (!response.ok || !payload.filePath || !payload.fileName) {
    throw new Error(payload.error || 'Сервер не принял PDF в защищённый карантин.')
  }
  return { filePath: payload.filePath, fileName: payload.fileName }
}

export async function removeKnowledgePdf(filePath: string): Promise<void> {
  if (!filePath) return
  const token = await authorizationToken()
  const response = await fetchWithTimeout(
    '/api/knowledge/files',
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath }),
    },
    30_000,
  )
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as KnowledgeFileResponse
    throw new Error(payload.error || 'Не удалось очистить незавершённую загрузку.')
  }
}

export async function downloadKnowledgePdf(
  filePath: string,
  fileName: string,
): Promise<void> {
  const token = await authorizationToken()
  const response = await fetchWithTimeout(
    `/api/knowledge/files?path=${encodeURIComponent(filePath)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
    60_000,
  )
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as KnowledgeFileResponse
    throw new Error(payload.error || 'Защищённый PDF недоступен.')
  }
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > MAX_KNOWLEDGE_PDF_SIZE) {
    throw new Error('PDF превышает допустимый размер.')
  }
  const blob = await response.blob()
  if (blob.size > MAX_KNOWLEDGE_PDF_SIZE) {
    throw new Error('PDF превышает допустимый размер.')
  }

  const objectUrl = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName || 'material.pdf'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
  }
}
