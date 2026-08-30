import { auth } from './firebase'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface AvatarUploadResponse {
  ok?: boolean
  avatarUrl?: string
  error?: string
}

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error('Используйте изображение JPG, PNG или WebP.')
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_SIZE) {
    throw new Error('Размер фотографии не должен превышать 5 МБ.')
  }

  const user = auth.currentUser
  if (!user || user.uid !== uid) {
    throw new Error('Сессия авторизации устарела. Войдите повторно.')
  }

  const token = await user.getIdToken()
  const form = new FormData()
  form.append('file', file, file.name)

  let response: Response
  try {
    response = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  } catch {
    throw new Error('Связь с сервером прервалась. Проверьте интернет.')
  }

  const payload = (await response.json().catch(() => ({}))) as AvatarUploadResponse
  if (!response.ok || !payload.avatarUrl) {
    throw new Error(payload.error || 'Не удалось безопасно загрузить фотографию.')
  }

  return payload.avatarUrl
}
