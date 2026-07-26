import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { deleteObject, getBlob, ref } from 'firebase/storage'
import { auth, db } from './firebase'
import { storage } from './firebase-storage'

export type MedicalModule =
  | 'board'
  | 'imaging'
  | 'anatomy'
  | 'case'
  | 'labs'
  | 'ecg'
  | 'privacy'

export type ImagingModality = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'ecg' | 'other'
export type AnatomyLayer = 'organs' | 'skeleton' | 'vessels'
export type AnatomyView = 'front' | 'left' | 'back' | 'right'

export interface ClinicalCaseData {
  complaint: string
  anamnesis: string
  examination: string
  diagnosis: string
  differential: string
  plan: string
  teachingGoal: string
}

export interface LabRow {
  id: string
  name: string
  value: string
  unit: string
  referenceLow: string
  referenceHigh: string
  note: string
}

export interface EcgData {
  rhythm: string
  heartRate: string
  axis: string
  prMs: string
  qrsMs: string
  qtMs: string
  qtcMs: string
  conclusion: string
}

export interface PrivacyChecklist {
  deidentified: boolean
  identifiersRemoved: boolean
  consentConfirmed: boolean
  educationalUseOnly: boolean
  patientLabel: string
}

export interface MedicalBoardBackground {
  kind: 'none' | 'image' | 'anatomy'
  assetId: string
  label: string
  anatomyLayer: AnatomyLayer
  anatomyView: AnatomyView
  anatomyRegion: string
}

export interface MedicalWorkspaceData {
  bookingId: string
  clinicalCase: ClinicalCaseData
  labs: LabRow[]
  ecg: EcgData
  privacy: PrivacyChecklist
  boardBackground: MedicalBoardBackground
  updatedByUid: string
  version?: number
  lastRevisionId?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MedicalAsset {
  id: string
  bookingId: string
  uploaderUid: string
  uploaderName: string
  modality: ImagingModality
  storagePath: string
  fileName: string
  mimeType: string
  fileSize: number
  deidentified: boolean
  createdAt?: unknown
}

const EMPTY_CASE: ClinicalCaseData = {
  complaint: '',
  anamnesis: '',
  examination: '',
  diagnosis: '',
  differential: '',
  plan: '',
  teachingGoal: '',
}

const EMPTY_ECG: EcgData = {
  rhythm: 'Синусовый',
  heartRate: '70',
  axis: 'Нормальная',
  prMs: '160',
  qrsMs: '90',
  qtMs: '380',
  qtcMs: '410',
  conclusion: '',
}

const EMPTY_PRIVACY: PrivacyChecklist = {
  deidentified: false,
  identifiersRemoved: false,
  consentConfirmed: false,
  educationalUseOnly: true,
  patientLabel: 'Учебный пациент',
}

const EMPTY_BACKGROUND: MedicalBoardBackground = {
  kind: 'none',
  assetId: '',
  label: '',
  anatomyLayer: 'organs',
  anatomyView: 'front',
  anatomyRegion: 'thorax',
}

export function emptyMedicalWorkspace(bookingId: string): MedicalWorkspaceData {
  return {
    bookingId,
    clinicalCase: { ...EMPTY_CASE },
    labs: [],
    ecg: { ...EMPTY_ECG },
    privacy: { ...EMPTY_PRIVACY },
    boardBackground: { ...EMPTY_BACKGROUND },
    updatedByUid: '',
    version: 0,
    lastRevisionId: '',
  }
}

function normalizeWorkspace(
  bookingId: string,
  data: Partial<MedicalWorkspaceData> | undefined,
): MedicalWorkspaceData {
  const fallback = emptyMedicalWorkspace(bookingId)
  return {
    ...fallback,
    ...data,
    bookingId,
    clinicalCase: { ...fallback.clinicalCase, ...(data?.clinicalCase ?? {}) },
    labs: Array.isArray(data?.labs) ? data.labs.slice(0, 100) : [],
    ecg: { ...fallback.ecg, ...(data?.ecg ?? {}) },
    privacy: { ...fallback.privacy, ...(data?.privacy ?? {}) },
    boardBackground: {
      ...fallback.boardBackground,
      ...(data?.boardBackground ?? {}),
    },
  }
}

export function subscribeToMedicalWorkspace(
  bookingId: string,
  onChange: (workspace: MedicalWorkspaceData) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'medicalWorkspaces', bookingId),
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange(
        normalizeWorkspace(
          bookingId,
          snapshot.exists()
            ? (snapshot.data() as Partial<MedicalWorkspaceData>)
            : undefined,
        ),
      )
    },
    onError,
  )
}

export async function saveMedicalWorkspacePatch(
  bookingId: string,
  userUid: string,
  patch: Partial<
    Pick<
      MedicalWorkspaceData,
      'clinicalCase' | 'labs' | 'ecg' | 'privacy' | 'boardBackground'
    >
  >,
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== userUid) {
    throw new Error('Сессия устарела. Войдите в MedStart ещё раз.')
  }
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/medical-workspace/save', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({ bookingId, patch }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  }
  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось сохранить медицинские данные.')
  }
}

function assetsCollection(bookingId: string) {
  return collection(db, 'medicalWorkspaces', bookingId, 'assets')
}

export function subscribeToMedicalAssets(
  bookingId: string,
  onChange: (assets: MedicalAsset[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    assetsCollection(bookingId),
    { includeMetadataChanges: true },
    (snapshot) => {
      const assets = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as MedicalAsset)
        .sort((left, right) => left.fileName.localeCompare(right.fileName, 'ru'))
      onChange(assets)
    },
    onError,
  )
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-120)
  return cleaned || 'medical-image'
}

function isDicom(file: File) {
  return file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom'
}

export async function uploadMedicalAsset(_input: {
  bookingId: string
  uploaderUid: string
  uploaderName: string
  modality: ImagingModality
  file: File
  deidentified: boolean
}): Promise<string> {
  throw new Error(
    'Загрузка пользовательских медицинских файлов временно отключена до внедрения серверного обезличивания и проверки метаданных. Используйте только встроенные учебные модели.',
  )
}

export async function loadMedicalAssetObjectUrl(asset: MedicalAsset) {
  if (asset.mimeType === 'application/dicom') return ''
  const blob = await getBlob(ref(storage, asset.storagePath), 20 * 1024 * 1024)
  return URL.createObjectURL(blob)
}

export async function deleteMedicalAsset(asset: MedicalAsset): Promise<void> {
  await deleteObject(ref(storage, asset.storagePath)).catch(() => undefined)
  await deleteDoc(
    doc(db, 'medicalWorkspaces', asset.bookingId, 'assets', asset.id),
  )
}

export function newLabRow(): LabRow {
  return {
    id: randomId(),
    name: '',
    value: '',
    unit: '',
    referenceLow: '',
    referenceHigh: '',
    note: '',
  }
}

export interface IdentifierFinding {
  type: 'email' | 'phone' | 'document' | 'fullName' | 'date'
  label: string
  match: string
}

const IDENTIFIER_PATTERNS: Array<{
  type: IdentifierFinding['type']
  label: string
  pattern: RegExp
}> = [
  {
    type: 'email',
    label: 'Электронная почта',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: 'phone',
    label: 'Телефон',
    pattern: /(?:\+7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g,
  },
  {
    type: 'document',
    label: 'Вероятный номер документа',
    pattern: /\b\d{3}[- ]?\d{3}[- ]?\d{3}[- ]?\d{2}\b/g,
  },
  {
    type: 'fullName',
    label: 'Вероятное ФИО',
    pattern: /\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?\b/g,
  },
  {
    type: 'date',
    label: 'Дата, требующая проверки',
    pattern: /\b(?:0?[1-9]|[12]\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:19|20)\d{2}\b/g,
  },
]

export function scanMedicalText(text: string): IdentifierFinding[] {
  const findings: IdentifierFinding[] = []
  for (const item of IDENTIFIER_PATTERNS) {
    const matches = text.match(item.pattern) ?? []
    for (const match of matches.slice(0, 8)) {
      findings.push({ type: item.type, label: item.label, match })
    }
  }
  return findings.slice(0, 30)
}

export function redactMedicalText(text: string): string {
  let result = text
  for (const item of IDENTIFIER_PATTERNS) {
    result = result.replace(item.pattern, `[удалено: ${item.label.toLowerCase()}]`)
  }
  return result
}
