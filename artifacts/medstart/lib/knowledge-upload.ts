import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase-storage'

export const MAX_KNOWLEDGE_PDF_SIZE = 25 * 1024 * 1024

function safeFileName(value: string) {
  const extension = value.toLowerCase().endsWith('.pdf') ? '.pdf' : ''
  const base = value
    .replace(/\.pdf$/i, '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
  return `${base || 'material'}${extension || '.pdf'}`
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
    throw new Error('Файл не прошёл проверку формата PDF.')
  }
}

export async function uploadKnowledgePdf(
  tutorUid: string,
  submissionId: string,
  file: File,
): Promise<{ filePath: string; fileName: string }> {
  await validateKnowledgePdf(file)
  const fileName = safeFileName(file.name)
  const filePath = `knowledge-submissions/${tutorUid}/${submissionId}/${fileName}`
  await uploadBytes(ref(storage, filePath), file, {
    contentType: 'application/pdf',
    contentDisposition: `attachment; filename="${fileName}"`,
    cacheControl: 'private,max-age=3600',
    customMetadata: {
      submissionId,
      tutorUid,
    },
  })
  return { filePath, fileName }
}

export async function removeKnowledgePdf(filePath: string): Promise<void> {
  if (!filePath) return
  await deleteObject(ref(storage, filePath))
}

export async function downloadKnowledgePdf(
  filePath: string,
  fileName: string,
): Promise<void> {
  const bytes = await getBytes(ref(storage, filePath), MAX_KNOWLEDGE_PDF_SIZE)
  const objectUrl = URL.createObjectURL(
    new Blob([bytes], { type: 'application/pdf' }),
  )
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName || 'material.pdf'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
}
