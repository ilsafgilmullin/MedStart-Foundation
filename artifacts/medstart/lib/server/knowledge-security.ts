import { sanitizeOriginalFileName } from './file-security'
import { KnowledgeAccessError } from './knowledge-access'

export const MAX_KNOWLEDGE_PDF_SIZE = 25 * 1024 * 1024
export const KNOWLEDGE_SIGNATURE_BYTES = 512

const KINDS = new Set([
  'book',
  'clinical_guideline',
  'instruction',
  'standard',
  'checklist',
  'video',
  'article',
])
const DISCIPLINES = new Set([
  'general',
  'anatomy',
  'physiology',
  'pharmacology',
  'therapy',
  'surgery',
  'pediatrics',
  'nursing',
  'emergency',
  'accreditation',
])
const LEVELS = new Set(['all', 'college', 'university', 'residency'])
const SOURCE_MODES = new Set(['link', 'file'])

export interface NormalizedKnowledgeSubmissionInput {
  id: string
  title: string
  description: string
  kind: string
  discipline: string
  level: string
  author: string
  publicationYear: string
  sourceMode: 'link' | 'file'
  sourceUrl: string
  filePath: string
  rightsConfirmed: true
  medicalConfirmed: true
  noPatientDataConfirmed: true
}

export type KnowledgeStoragePath = {
  kind: 'quarantine' | 'published' | 'legacy'
  submissionId: string
  uploaderUid: string
  fileName: string
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function validateKnowledgeSubmissionId(value: unknown) {
  const id = clean(value, 160)
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(id)) {
    throw new KnowledgeAccessError(
      400,
      'INVALID_SUBMISSION_ID',
      'Некорректный идентификатор материала.',
    )
  }
  return id
}

export function validateKnowledgeHttpsUrl(value: unknown) {
  const normalized = clean(value, 2_000)
  try {
    const parsed = new URL(normalized)
    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error('invalid')
    }
    return parsed.toString().slice(0, 2_000)
  } catch {
    throw new KnowledgeAccessError(
      400,
      'INVALID_SOURCE_URL',
      'Укажите безопасную ссылку, начинающуюся с https:// и без встроенных учётных данных.',
    )
  }
}

export function canonicalKnowledgePdfName(value: string) {
  const sanitized = sanitizeOriginalFileName(value)
  const stem = sanitized
    .replace(/\.[^.]*$/, '')
    .replace(/^[-. ]+|[-. ]+$/g, '')
    .slice(0, 190)
  return `${stem || 'material'}.pdf`
}

export function parseKnowledgeStoragePath(pathValue: unknown): KnowledgeStoragePath {
  const path = clean(pathValue, 1_000)
  let match = /^knowledge-quarantine\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(path)
  if (match) {
    return {
      kind: 'quarantine',
      uploaderUid: match[1],
      submissionId: validateKnowledgeSubmissionId(match[2]),
      fileName: match[3],
    }
  }

  match = /^knowledge-published\/([^/]+)\/([^/]+)$/.exec(path)
  if (match) {
    return {
      kind: 'published',
      uploaderUid: '',
      submissionId: validateKnowledgeSubmissionId(match[1]),
      fileName: match[2],
    }
  }

  match = /^knowledge-submissions\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(path)
  if (match) {
    return {
      kind: 'legacy',
      uploaderUid: match[1],
      submissionId: validateKnowledgeSubmissionId(match[2]),
      fileName: match[3],
    }
  }

  throw new KnowledgeAccessError(
    400,
    'INVALID_KNOWLEDGE_PATH',
    'Некорректный путь учебного файла.',
  )
}

export function normalizeKnowledgeSubmissionInput(
  value: unknown,
): NormalizedKnowledgeSubmissionInput {
  const input = value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
  const id = validateKnowledgeSubmissionId(input.id)
  const title = clean(input.title, 180)
  const description = clean(input.description, 4_000)
  const author = clean(input.author, 160)
  const publicationYear = clean(input.publicationYear, 20)
  const kind = clean(input.kind, 80)
  const discipline = clean(input.discipline, 80)
  const level = clean(input.level, 40)
  const sourceMode = clean(input.sourceMode, 20)

  if (title.length < 3) {
    throw new KnowledgeAccessError(
      400,
      'TITLE_TOO_SHORT',
      'Название должно содержать не менее трёх символов.',
    )
  }
  if (description.length < 20) {
    throw new KnowledgeAccessError(
      400,
      'DESCRIPTION_TOO_SHORT',
      'Коротко опишите содержание и учебную пользу материала.',
    )
  }
  if (author.length < 2) {
    throw new KnowledgeAccessError(
      400,
      'AUTHOR_REQUIRED',
      'Укажите автора или организацию.',
    )
  }
  if (!KINDS.has(kind) || !DISCIPLINES.has(discipline) || !LEVELS.has(level)) {
    throw new KnowledgeAccessError(
      400,
      'INVALID_CLASSIFICATION',
      'Категория учебного материала не поддерживается.',
    )
  }
  if (!SOURCE_MODES.has(sourceMode)) {
    throw new KnowledgeAccessError(
      400,
      'INVALID_SOURCE_MODE',
      'Некорректный способ добавления материала.',
    )
  }
  if (
    input.rightsConfirmed !== true ||
    input.medicalConfirmed !== true ||
    input.noPatientDataConfirmed !== true
  ) {
    throw new KnowledgeAccessError(
      400,
      'CONFIRMATIONS_REQUIRED',
      'Подтвердите тематику, права и отсутствие данных пациентов.',
    )
  }

  const normalizedMode = sourceMode as 'link' | 'file'
  const sourceUrl = normalizedMode === 'link'
    ? validateKnowledgeHttpsUrl(input.sourceUrl)
    : ''
  const filePath = normalizedMode === 'file' ? clean(input.filePath, 1_000) : ''
  if (normalizedMode === 'file' && !filePath) {
    throw new KnowledgeAccessError(
      400,
      'FILE_REQUIRED',
      'PDF-файл не был загружен в карантин.',
    )
  }

  return {
    id,
    title,
    description,
    kind,
    discipline,
    level,
    author,
    publicationYear,
    sourceMode: normalizedMode,
    sourceUrl,
    filePath,
    rightsConfirmed: true,
    medicalConfirmed: true,
    noPatientDataConfirmed: true,
  }
}
