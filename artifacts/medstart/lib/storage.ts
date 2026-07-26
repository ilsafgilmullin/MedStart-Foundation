import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase-storage'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error('Используйте изображение JPG, PNG или WebP.')
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error('Размер фотографии не должен превышать 5 МБ.')
  }

  const avatarRef = ref(storage, `avatars/${uid}/profile`)
  await uploadBytes(avatarRef, file, {
    contentType: file.type,
    cacheControl: 'public,max-age=3600',
  })
  return getDownloadURL(avatarRef)
}
