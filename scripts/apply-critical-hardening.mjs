import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content)
}

function replaceOnce(path, search, replacement) {
  const content = read(path)
  const first = content.indexOf(search)
  if (first < 0) throw new Error(`${path}: fragment not found:\n${search.slice(0, 180)}`)
  if (content.indexOf(search, first + search.length) >= 0) {
    throw new Error(`${path}: fragment occurs more than once`)
  }
  write(path, content.slice(0, first) + replacement + content.slice(first + search.length))
}

function replaceRegexOnce(path, pattern, replacement) {
  const content = read(path)
  const matches = [...content.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))]
  if (matches.length !== 1) {
    throw new Error(`${path}: expected one regex match, got ${matches.length}: ${pattern}`)
  }
  write(path, content.replace(pattern, replacement))
}

function replaceBetween(path, startMarker, endMarker, replacement) {
  const content = read(path)
  const start = content.indexOf(startMarker)
  const end = content.indexOf(endMarker, start + startMarker.length)
  if (start < 0 || end < 0) {
    throw new Error(`${path}: range markers not found`)
  }
  write(path, content.slice(0, start) + replacement + content.slice(end))
}

// 1. Firestore: blocked/deleted accounts lose access immediately.
const firestorePath = 'firestore.rules'
const userProfileBlock = `    function userProfile(userId) {
      return get(
        /databases/$(database)/documents/users/$(userId)
      ).data;
    }
`
replaceOnce(
  firestorePath,
  userProfileBlock,
  `${userProfileBlock}
    function hasUsableAccount() {
      return signedIn()
        && userExists(request.auth.uid)
        && userProfile(request.auth.uid).status != 'blocked'
        && userProfile(request.auth.uid).status != 'deleted';
    }
`,
)
replaceOnce(
  firestorePath,
  `    function isOwner() {
      return signedIn()
        && request.auth.uid == 'm8JbbeeXMmZzywUwHboOyMm9MnG2';
    }
`,
  `    function isOwner() {
      return hasUsableAccount()
        && request.auth.uid == 'm8JbbeeXMmZzywUwHboOyMm9MnG2';
    }
`,
)
replaceOnce(
  firestorePath,
  `      allow read: if isOwnProfile(userId);
`,
  `      allow read: if isOwnProfile(userId) && hasUsableAccount();
`,
)
replaceOnce(
  firestorePath,
  `      allow create: if isOwnProfile(userId)
`,
  `      allow create: if isOwnProfile(userId) && hasUsableAccount()
`,
)
replaceOnce(
  firestorePath,
  `      allow delete: if isOwnProfile(userId);
`,
  `      allow delete: if isOwnProfile(userId) && hasUsableAccount();
`,
)
replaceRegexOnce(
  firestorePath,
  /(function isBookingParticipant\(\) \{\n\s+return )signedIn\(\)/,
  '$1hasUsableAccount()',
)
replaceOnce(
  firestorePath,
  `    match /bookings/{bookingId} {
      allow create: if signedIn() && validBookingCreate();
      allow read: if isModerator() || isBookingParticipant();
      allow update: if isOwner()
        || (
          signedIn()
          && (
            validTutorBookingDecision()
            || validStudentBookingCancellation()
            || validTutorBookingCompletion()
          )
        );
      allow delete: if isOwner();
    }
`,
  `    match /bookings/{bookingId} {
      // Создание выполняется только серверным API после сверки цены,
      // расписания, статуса аккаунтов и пересечений занятий.
      allow create: if false;
      allow read: if isModerator() || isBookingParticipant();
      allow update: if isOwner()
        || (
          hasUsableAccount()
          && (
            validTutorBookingDecision()
            || validStudentBookingCancellation()
            || validTutorBookingCompletion()
          )
        );
      allow delete: if isOwner();
    }
`,
)
replaceRegexOnce(
  firestorePath,
  /(function conversationParticipant\(conversationId\) \{\n\s+return )signedIn\(\)/,
  '$1hasUsableAccount()',
)
replaceRegexOnce(
  firestorePath,
  /(function conversationParticipantAfter\(conversationId\) \{\n\s+return )signedIn\(\)/,
  '$1hasUsableAccount()',
)
replaceOnce(
  firestorePath,
  `      allow create: if signedIn() && validConversationCreate();
`,
  `      allow create: if false;
`,
)
replaceOnce(
  firestorePath,
  `          signedIn()
          && request.auth.uid in resource.data.participantUids
`,
  `          hasUsableAccount()
          && request.auth.uid in resource.data.participantUids
`,
)
replaceOnce(
  firestorePath,
  `      allow update: if isOwner()
        || (signedIn() && validConversationUpdate());
`,
  `      allow update: if isOwner()
        || (hasUsableAccount() && validConversationUpdate());
`,
)
replaceOnce(
  firestorePath,
  `      allow read: if signedIn();
      allow create, update: if signedIn()
`,
  `      allow read: if hasUsableAccount();
      allow create, update: if hasUsableAccount()
`,
)
replaceOnce(
  firestorePath,
  `      allow create: if signedIn() && validMaterialCreate();
`,
  `      allow create: if hasUsableAccount() && validMaterialCreate();
`,
)
replaceOnce(
  firestorePath,
  `          signedIn()
          && (
            resource.data.tutorUid == request.auth.uid
`,
  `          hasUsableAccount()
          && (
            resource.data.tutorUid == request.auth.uid
`,
)
replaceOnce(
  firestorePath,
  `      allow update: if signedIn()
        && resource.data.tutorUid == request.auth.uid
`,
  `      allow update: if hasUsableAccount()
        && resource.data.tutorUid == request.auth.uid
`,
)
replaceOnce(
  firestorePath,
  `          signedIn()
          && resource.data.tutorUid == request.auth.uid
`,
  `          hasUsableAccount()
          && resource.data.tutorUid == request.auth.uid
`,
)
replaceOnce(
  firestorePath,
  `      allow create: if signedIn()
        && validKnowledgeSubmissionCreate(submissionId);
`,
  `      allow create: if hasUsableAccount()
        && validKnowledgeSubmissionCreate(submissionId);
`,
)
replaceOnce(
  firestorePath,
  `          signedIn()
          && (
            resource.data.status == 'published'
`,
  `          hasUsableAccount()
          && (
            resource.data.status == 'published'
`,
)
replaceOnce(
  firestorePath,
  `          signedIn()
          && resource.data.submittedByUid == request.auth.uid
`,
  `          hasUsableAccount()
          && resource.data.submittedByUid == request.auth.uid
`,
)
replaceRegexOnce(
  firestorePath,
  /(function canReadWhiteboard\(bookingId\) \{\n\s+return )signedIn\(\)/,
  '$1hasUsableAccount()',
)
replaceRegexOnce(
  firestorePath,
  /(function canWriteWhiteboard\(bookingId\) \{\n\s+return )signedIn\(\)/,
  '$1hasUsableAccount()',
)
replaceOnce(
  firestorePath,
  `      allow create, update: if canWriteWhiteboard(bookingId)
        && validMedicalWorkspace(request.resource.data, bookingId);
`,
  `      // Медицинские поля записывает только сервер с валидацией и ревизиями.
      allow create, update: if false;
`,
)
replaceOnce(
  firestorePath,
  `        allow create: if canWriteWhiteboard(bookingId)
          && validMedicalAsset(request.resource.data, bookingId, assetId);
`,
  `        // Пользовательские медицинские файлы отключены до внедрения
        // серверного обезличивания, карантина и проверки метаданных.
        allow create: if false;
`,
)

// 2. Storage: same account revocation and hard stop for medical uploads.
const storagePath = 'storage.rules'
const storageProfileBlock = `    function userProfile(userId) {
      return firestore.get(
        /databases/(default)/documents/users/$(userId)
      ).data;
    }
`
replaceOnce(
  storagePath,
  storageProfileBlock,
  `${storageProfileBlock}
    function hasUsableAccount() {
      return signedIn()
        && userProfile(request.auth.uid).status != 'blocked'
        && userProfile(request.auth.uid).status != 'deleted';
    }
`,
)
replaceOnce(
  storagePath,
  `    function isOwner() {
      return signedIn()
        && request.auth.uid == 'm8JbbeeXMmZzywUwHboOyMm9MnG2';
    }
`,
  `    function isOwner() {
      return hasUsableAccount()
        && request.auth.uid == 'm8JbbeeXMmZzywUwHboOyMm9MnG2';
    }
`,
)
replaceOnce(
  storagePath,
  `      allow write: if request.auth != null
        && request.auth.uid == userId
`,
  `      allow write: if hasUsableAccount()
        && request.auth.uid == userId
`,
)
replaceOnce(
  storagePath,
  `      allow read: if signedIn()
`,
  `      allow read: if hasUsableAccount()
`,
)
replaceRegexOnce(
  storagePath,
  /(function canReadMedicalAsset\(bookingId\) \{\n\s+return )signedIn\(\)/,
  '$1hasUsableAccount()',
)
replaceRegexOnce(
  storagePath,
  /(function canWriteMedicalAsset\(bookingId\) \{\n\s+return )signedIn\(\)/,
  '$1hasUsableAccount()',
)
replaceRegexOnce(
  storagePath,
  /      allow create: if canWriteMedicalAsset\(bookingId\)[\s\S]*?\n        \);\n\n      allow update: if false;/,
  `      // До появления серверного обезличивания, удаления DICOM/EXIF-метаданных,
      // карантина и антивирусной проверки новые медицинские файлы запрещены.
      allow create: if false;

      allow update: if false;`,
)
replaceOnce(
  storagePath,
  `      allow delete: if signedIn()
        && (
`,
  `      allow delete: if hasUsableAccount()
        && (
`,
)

// 3. Sensitive Firestore data no longer persists on disk.
const firebasePath = 'artifacts/medstart/lib/firebase.ts'
replaceOnce(
  firebasePath,
  `import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
`,
  `import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore'
`,
)
replaceBetween(
  firebasePath,
  'function createFirestore() {',
  'export const db = createFirestore()',
  `function createFirestore() {
  try {
    // Medical and lesson data stay in memory. Persistent browser storage is
    // intentionally disabled until encrypted device storage and remote logout
    // are implemented.
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    })
  } catch {
    return getFirestore(app)
  }
}

`,
)

// 4. Whiteboard cache is session-scoped and removed on logout.
const whiteboardPath = 'artifacts/medstart/components/live/ServerlessWhiteboard.tsx'
let whiteboard = read(whiteboardPath)
whiteboard = whiteboard.replaceAll('localStorage.', 'sessionStorage.')
whiteboard = whiteboard.replaceAll(
  'Private mode can disable local storage.',
  'Private mode can disable session storage.',
)
write(whiteboardPath, whiteboard)

// 5. Logout clears every MedStart client cache.
const authPath = 'artifacts/medstart/lib/auth.ts'
replaceOnce(
  authPath,
  `export const logout = () => signOut(auth)
`,
  `async function clearSensitiveClientState() {
  if (typeof window === 'undefined') return

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys: string[] = []
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (key?.startsWith('medstart-')) keys.push(key)
      }
      keys.forEach((key) => storage.removeItem(key))
    } catch {
      // Storage can be unavailable in private mode.
    }
  }

  if ('caches' in window) {
    try {
      const names = await window.caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('medstart-'))
          .map((name) => window.caches.delete(name)),
      )
    } catch {
      // Cache cleanup must not prevent sign-out.
    }
  }
}

export async function logout() {
  await signOut(auth)
  await clearSensitiveClientState()
}
`,
)

// 6. Booking creation uses the protected server route.
const bookingsPath = 'artifacts/medstart/lib/bookings.ts'
replaceBetween(
  bookingsPath,
  "import {\n",
  'export interface CreateBookingInput',
  `import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import {
  sortBookings,
  type Booking,
  type BookingStatus,
} from './domain'
import type {
  EffectiveUserRole,
  LessonFormat,
  UserProfile,
} from './user-profile'

`,
)
replaceOnce(
  bookingsPath,
  `function defaultTimezone(profile: UserProfile) {
  return profile.timezone || 'Europe/Moscow'
}

`,
  '',
)
replaceBetween(
  bookingsPath,
  'export async function createBooking(',
  'export function subscribeToBookingsForUser(',
  `export async function createBooking(
  input: CreateBookingInput,
): Promise<{ bookingId: string; conversationId: string }> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.student.uid) {
    throw new Error('Сессия устарела. Войдите в MedStart ещё раз.')
  }
  if (input.student.role !== 'student' || input.student.status !== 'active') {
    throw new Error('Запись доступна только активному аккаунту студента.')
  }

  const subject = clean(input.subject)
  const requestedDate = clean(input.requestedDate)
  const requestedTime = clean(input.requestedTime)
  if (!subject || !requestedDate || !requestedTime) {
    throw new Error('Укажите предмет, дату и время занятия.')
  }

  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings/create', {
    method: 'POST',
    headers: {
      Authorization: \\`Bearer \\${token}\\`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      tutorUid: input.tutor.uid,
      subject,
      goal: clean(input.goal),
      requestedDate,
      requestedTime,
      format: input.format,
      message: clean(input.message),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    bookingId?: string
    conversationId?: string
  }
  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось создать заявку.')
  }
  if (!payload.bookingId || !payload.conversationId) {
    throw new Error('Сервер вернул неполные данные заявки.')
  }
  return {
    bookingId: payload.bookingId,
    conversationId: payload.conversationId,
  }
}

`,
)

// 7. Medical workspace writes are validated and versioned by the server.
const medicalPath = 'artifacts/medstart/lib/medical-workspace.ts'
replaceOnce(
  medicalPath,
  `import { deleteObject, getBlob, ref, uploadBytes } from 'firebase/storage'
import { db } from './firebase'
`,
  `import { deleteObject, getBlob, ref } from 'firebase/storage'
import { auth, db } from './firebase'
`,
)
replaceOnce(
  medicalPath,
  `  updatedByUid: string
  createdAt?: unknown
`,
  `  updatedByUid: string
  version?: number
  lastRevisionId?: string
  createdAt?: unknown
`,
)
replaceOnce(
  medicalPath,
  `    updatedByUid: '',
`,
  `    updatedByUid: '',
    version: 0,
    lastRevisionId: '',
`,
)
replaceBetween(
  medicalPath,
  'export async function saveMedicalWorkspacePatch(',
  'function assetsCollection(bookingId: string)',
  `export async function saveMedicalWorkspacePatch(
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
      Authorization: \\`Bearer \\${token}\\`,
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

`,
)
replaceBetween(
  medicalPath,
  'export async function uploadMedicalAsset(',
  'export async function loadMedicalAssetObjectUrl(',
  `export async function uploadMedicalAsset(_input: {
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

`,
)

// 8. CI protects main and verifies critical invariants.
const ciPath = '.github/workflows/medstart-ci.yml'
replaceOnce(
  ciPath,
  `    branches:
      - audit/medstart-v2-clean
`,
  `    branches:
      - main
      - fix/critical-hardening-v1
`,
)
replaceOnce(
  ciPath,
  `      - 'artifacts/medstart/**'
`,
  `      - 'artifacts/medstart/**'
      - 'firestore.rules'
      - 'storage.rules'
      - 'scripts/**'
`,
)
replaceOnce(
  ciPath,
  `      - name: Setup Node
`,
  `      - name: Verify critical security invariants
        run: node scripts/verify-critical-hardening.mjs

      - name: Setup Node
`,
)

const v6CiPath = '.github/workflows/medstart-v6-validate.yml'
replaceOnce(
  v6CiPath,
  `    branches:
      - agent/medical-workspace-v6
`,
  `    branches:
      - main
      - fix/critical-hardening-v1
`,
)
replaceOnce(
  v6CiPath,
  `      - name: Set up pnpm
`,
  `      - name: Verify critical security invariants
        run: node scripts/verify-critical-hardening.mjs

      - name: Set up pnpm
`,
)

console.log('Critical hardening migration applied successfully.')
