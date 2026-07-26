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
  if (first < 0) throw new Error(`${path}: fragment not found`)
  if (content.indexOf(search, first + search.length) >= 0) {
    throw new Error(`${path}: fragment occurs more than once`)
  }
  write(path, content.slice(0, first) + replacement + content.slice(first + search.length))
}

function replaceBetween(path, startMarker, endMarker, replacement) {
  const content = read(path)
  const start = content.indexOf(startMarker)
  const end = content.indexOf(endMarker, start + startMarker.length)
  if (start < 0 || end < 0) throw new Error(`${path}: range markers not found`)
  write(path, content.slice(0, start) + replacement + content.slice(end))
}

const firestorePath = 'firestore.rules'
replaceOnce(
  firestorePath,
  `          isOwnProfile(userId)
          && (safeSelfUpdate() || validTutorResubmission())
`,
  `          hasUsableAccount()
          && isOwnProfile(userId)
          && (safeSelfUpdate() || validTutorResubmission())
`,
)
replaceOnce(
  firestorePath,
  `    match /tutorPrivateProfiles/{tutorId} {
      allow read: if isModerator() || isOwnProfile(tutorId);
      allow create, update: if isOwnProfile(tutorId)
        && userExists(tutorId)
        && userProfile(tutorId).role == 'tutor'
        && validTutorPrivateProfile(tutorId);
      allow delete: if isOwner() || isOwnProfile(tutorId);
    }
`,
  `    match /tutorPrivateProfiles/{tutorId} {
      allow read: if isModerator()
        || (hasUsableAccount() && isOwnProfile(tutorId));
      allow create, update: if hasUsableAccount()
        && isOwnProfile(tutorId)
        && userExists(tutorId)
        && userProfile(tutorId).role == 'tutor'
        && validTutorPrivateProfile(tutorId);
      allow delete: if isOwner()
        || (hasUsableAccount() && isOwnProfile(tutorId));
    }
`,
)
replaceOnce(
  firestorePath,
  `      allow update: if isOwner()
        || (
          hasUsableAccount()
          && (
            validTutorBookingDecision()
            || validStudentBookingCancellation()
            || validTutorBookingCompletion()
          )
        );
`,
  `      // Статусы меняет только серверный API с повторной проверкой участника
      // и пересечений подтверждённых занятий.
      allow update: if false;
`,
)
replaceOnce(
  firestorePath,
  `      allow delete: if isOwner() || isOwnProfile(tutorId);
`,
  `      allow delete: if isOwner()
        || (hasUsableAccount() && isOwnProfile(tutorId));
`,
)
replaceOnce(
  firestorePath,
  `      match /assets/{assetId} {
        allow read: if canReadWhiteboard(bookingId);
        // Пользовательские медицинские файлы отключены до внедрения
        // серверного обезличивания, карантина и проверки метаданных.
        allow create: if false;
        allow update: if false;
        allow delete: if isOwner()
          || (
            canWriteWhiteboard(bookingId)
            && (
              resource.data.uploaderUid == request.auth.uid
              || isWhiteboardTutor(bookingId)
            )
          );
      }
`,
  `      match /assets/{assetId} {
        // Ранее загруженные пользовательские файлы помещены в карантин.
        // Их метаданные доступны только действующей администрации.
        allow read: if isModerator();
        allow create, update: if false;
        allow delete: if isModerator();
      }
`,
)

const storagePath = 'storage.rules'
replaceOnce(
  storagePath,
  `    match /medical-workspaces/{bookingId}/{userId}/{fileName} {
      allow read: if canReadMedicalAsset(bookingId);

      // До появления серверного обезличивания, удаления DICOM/EXIF-метаданных,
      // карантина и антивирусной проверки новые медицинские файлы запрещены.
      allow create: if false;

      allow update: if false;

      allow delete: if hasUsableAccount()
        && (
          request.auth.uid == userId
          || medicalBooking(bookingId).tutorUid == request.auth.uid
          || isModerator()
        );
    }
`,
  `    match /medical-workspaces/{bookingId}/{userId}/{fileName} {
      // Все ранее загруженные медицинские файлы помещены в карантин.
      allow read: if isModerator();
      allow create, update: if false;
      allow delete: if isModerator();
    }
`,
)

const createBookingPath = 'artifacts/medstart/app/api/bookings/create/route.ts'
replaceOnce(
  createBookingPath,
  `      const existingSnapshot = await transaction.get(
        database.collection('bookings').where('tutorUid', '==', tutorUid),
      )
      const requestedEnd = startsAtMs + durationMinutes * 60_000
      const hasConflict = existingSnapshot.docs.some((document) => {
        const existing = document.data() as Record<string, unknown>
        if (!['pending', 'accepted'].includes(String(existing.status))) return false
        const existingStart =
          timestampMillis(existing.startsAt) ||
          zonedDateTimeToMillis(
            String(existing.requestedDate || ''),
            String(existing.requestedTime || ''),
            String(existing.timezone || 'Europe/Moscow'),
          )
        const existingDuration = Math.min(
          180,
          Math.max(30, Number(existing.durationMinutes) || 60),
        )
        const existingEnd = existingStart + existingDuration * 60_000
        return existingStart < requestedEnd && startsAtMs < existingEnd
      })
`,
  `      const [tutorBookings, studentBookings] = await Promise.all([
        transaction.get(
          database.collection('bookings').where('tutorUid', '==', tutorUid),
        ),
        transaction.get(
          database.collection('bookings').where('studentUid', '==', decoded.uid),
        ),
      ])
      const requestedEnd = startsAtMs + durationMinutes * 60_000
      const hasConflict = [...tutorBookings.docs, ...studentBookings.docs].some(
        (document) => {
          const existing = document.data() as Record<string, unknown>
          if (!['pending', 'accepted'].includes(String(existing.status))) return false
          const existingStart =
            timestampMillis(existing.startsAt) ||
            zonedDateTimeToMillis(
              String(existing.requestedDate || ''),
              String(existing.requestedTime || ''),
              String(existing.timezone || 'Europe/Moscow'),
            )
          const existingDuration = Math.min(
            180,
            Math.max(30, Number(existing.durationMinutes) || 60),
          )
          const existingEnd = existingStart + existingDuration * 60_000
          return existingStart < requestedEnd && startsAtMs < existingEnd
        },
      )
`,
)
replaceOnce(
  createBookingPath,
  `      transaction.set(bookingRef, {
`,
  `      const rawPrice = Number(tutor.lessonPrice)
      const lessonPrice =
        Number.isFinite(rawPrice) && rawPrice >= 0 && rawPrice <= 1_000_000
          ? rawPrice
          : 0

      transaction.set(bookingRef, {
`,
)
replaceOnce(
  createBookingPath,
  `        price: Math.max(0, Number(tutor.lessonPrice) || 0),
`,
  `        price: lessonPrice,
`,
)
replaceOnce(
  createBookingPath,
  `      SLOT_CONFLICT: ['Это время уже занято другой заявкой или занятием.', 409],
`,
  `      SLOT_CONFLICT: ['В это время у репетитора или студента уже есть заявка либо занятие.', 409],
`,
)

const bookingsPath = 'artifacts/medstart/lib/bookings.ts'
replaceOnce(
  bookingsPath,
  `  query,
  runTransaction,
  serverTimestamp,
  where,
`,
  `  query,
  where,
`,
)
replaceBetween(
  bookingsPath,
  'export async function changeBookingStatus(',
  '\n}',
  `export async function changeBookingStatus(
  input: BookingActionInput,
): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser || currentUser.uid !== input.actorUid) {
    throw new Error('Сессия устарела. Войдите в MedStart ещё раз.')
  }
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/bookings/status', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      bookingId: input.bookingId,
      nextStatus: input.nextStatus,
      response: clean(input.response ?? ''),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  }
  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось обновить занятие.')
  }
}`,
)

const medicalRoutePath =
  'artifacts/medstart/app/api/medical-workspace/save/route.ts'
replaceOnce(
  medicalRoutePath,
  `interface SaveRequestBody {
  bookingId?: unknown
  patch?: unknown
}
`,
  `interface SaveRequestBody {
  bookingId?: unknown
  expectedVersion?: unknown
  patch?: unknown
}
`,
)
replaceOnce(
  medicalRoutePath,
  `function bool(value: unknown) {
  return value === true
}
`,
  `function bool(value: unknown) {
  return value === true
}

const IDENTIFIER_PATTERNS = [
  /\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b/gi,
  /(?:\\+7|8)[\\s()-]*\\d{3}[\\s()-]*\\d{3}[\\s-]*\\d{2}[\\s-]*\\d{2}/g,
  /\\b\\d{3}[- ]?\\d{3}[- ]?\\d{3}[- ]?\\d{2}\\b/g,
  /\\b[А-ЯЁ][а-яё]+\\s+[А-ЯЁ][а-яё]+(?:\\s+[А-ЯЁ][а-яё]+)?\\b/g,
  /\\b(?:0?[1-9]|[12]\\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:19|20)\\d{2}\\b/g,
]

function containsPotentialIdentifier(value: unknown) {
  const serialized = JSON.stringify(value)
  return IDENTIFIER_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0
    return pattern.test(serialized)
  })
}

function privacyConfirmed(value: unknown) {
  return (
    isRecord(value) &&
    value.deidentified === true &&
    value.identifiersRemoved === true &&
    value.consentConfirmed === true &&
    value.educationalUseOnly === true
  )
}

function hasProtectedContent(value: Record<string, unknown>) {
  const clinicalCase = isRecord(value.clinicalCase) ? value.clinicalCase : {}
  const hasCase = Object.values(clinicalCase).some(
    (item) => typeof item === 'string' && item.trim().length > 0,
  )
  const hasLabs = Array.isArray(value.labs) && value.labs.length > 0
  const ecg = isRecord(value.ecg) ? value.ecg : {}
  const hasEcgConclusion =
    typeof ecg.conclusion === 'string' && ecg.conclusion.trim().length > 0
  return hasCase || hasLabs || hasEcgConclusion
}
`,
)
replaceOnce(
  medicalRoutePath,
  `  if (!/^[A-Za-z0-9_-]{6,160}$/.test(bookingId)) {
    return jsonError('Некорректный идентификатор занятия.', 400)
  }

  let sanitized: { key: WorkspaceKey; value: unknown }
`,
  `  if (!/^[A-Za-z0-9_-]{6,160}$/.test(bookingId)) {
    return jsonError('Некорректный идентификатор занятия.', 400)
  }
  const expectedVersion = Number(body.expectedVersion)
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return jsonError('Некорректная версия медицинского пространства.', 400)
  }

  let sanitized: { key: WorkspaceKey; value: unknown }
`,
)
replaceOnce(
  medicalRoutePath,
  `  } catch {
    return jsonError('Медицинские данные имеют некорректную структуру.', 400)
  }

  try {
`,
  `  } catch {
    return jsonError('Медицинские данные имеют некорректную структуру.', 400)
  }
  if (
    ['clinicalCase', 'labs', 'ecg', 'privacy'].includes(sanitized.key) &&
    containsPotentialIdentifier(sanitized.value)
  ) {
    return jsonError(
      'Обнаружены возможные персональные данные пациента. Удалите ФИО, контакты, номера документов и точные даты.',
      422,
    )
  }

  try {
`,
)
replaceOnce(
  medicalRoutePath,
  `    await database.runTransaction(async (transaction) => {
`,
  `    const nextVersion = await database.runTransaction(async (transaction) => {
`,
)
replaceOnce(
  medicalRoutePath,
  `      const previous = workspaceSnapshot.exists ? workspaceSnapshot.data() || {} : {}
      const beforeValue = previous[sanitized.key] ?? null
`,
  `      const previous = workspaceSnapshot.exists ? workspaceSnapshot.data() || {} : {}
      const currentVersion = Number(previous.version) || 0
      if (currentVersion !== expectedVersion) {
        throw new Error('WORKSPACE_CONFLICT')
      }
      const effectivePrivacy =
        sanitized.key === 'privacy' ? sanitized.value : previous.privacy
      if (
        ['clinicalCase', 'labs', 'ecg'].includes(sanitized.key) &&
        !privacyConfirmed(effectivePrivacy)
      ) {
        throw new Error('PRIVACY_REQUIRED')
      }
      if (
        sanitized.key === 'privacy' &&
        !privacyConfirmed(sanitized.value) &&
        hasProtectedContent(previous)
      ) {
        throw new Error('PRIVACY_DOWNGRADE')
      }
      const beforeValue = previous[sanitized.key] ?? null
`,
)
replaceOnce(
  medicalRoutePath,
  `          version: FieldValue.increment(1),
`,
  `          version: currentVersion + 1,
`,
)
replaceOnce(
  medicalRoutePath,
  `      )
    })

    return NextResponse.json(
      { ok: true },
`,
  `      )
      return currentVersion + 1
    })

    return NextResponse.json(
      { ok: true, version: nextVersion },
`,
)
replaceOnce(
  medicalRoutePath,
  `      BOOKING_INACTIVE: ['Изменять данные можно только во время подтверждённого занятия.', 409],
`,
  `      BOOKING_INACTIVE: ['Изменять данные можно только во время подтверждённого занятия.', 409],
      WORKSPACE_CONFLICT: ['Данные занятия уже изменены другим участником. Дождитесь синхронизации и повторите сохранение.', 409],
      PRIVACY_REQUIRED: ['Сначала подтвердите все пункты обезличивания и законного учебного использования.', 409],
      PRIVACY_DOWNGRADE: ['Нельзя снять подтверждение безопасности, пока в занятии сохранены медицинские сведения.', 409],
`,
)

const medicalLibPath = 'artifacts/medstart/lib/medical-workspace.ts'
replaceOnce(
  medicalLibPath,
  `const EMPTY_BACKGROUND: MedicalBoardBackground = {
`,
  `const workspaceVersions = new Map<string, number>()

const EMPTY_BACKGROUND: MedicalBoardBackground = {
`,
)
replaceOnce(
  medicalLibPath,
  `    (snapshot) => {
      onChange(
        normalizeWorkspace(
          bookingId,
          snapshot.exists()
            ? (snapshot.data() as Partial<MedicalWorkspaceData>)
            : undefined,
        ),
      )
    },
`,
  `    (snapshot) => {
      const workspace = normalizeWorkspace(
        bookingId,
        snapshot.exists()
          ? (snapshot.data() as Partial<MedicalWorkspaceData>)
          : undefined,
      )
      workspaceVersions.set(bookingId, workspace.version ?? 0)
      onChange(workspace)
    },
`,
)
replaceOnce(
  medicalLibPath,
  `    body: JSON.stringify({ bookingId, patch }),
`,
  `    body: JSON.stringify({
      bookingId,
      expectedVersion: workspaceVersions.get(bookingId) ?? 0,
      patch,
    }),
`,
)
replaceOnce(
  medicalLibPath,
  `  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
  }
`,
  `  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    version?: number
  }
`,
)
replaceOnce(
  medicalLibPath,
  `  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось сохранить медицинские данные.')
  }
}

function assetsCollection`,
  `  if (!response.ok) {
    throw new Error(payload.error || 'Не удалось сохранить медицинские данные.')
  }
  if (Number.isSafeInteger(payload.version)) {
    workspaceVersions.set(bookingId, payload.version!)
  }
}

function assetsCollection`,
)
replaceBetween(
  medicalLibPath,
  'export function subscribeToMedicalAssets(',
  '\n}\n\nfunction randomId()',
  `export function subscribeToMedicalAssets(
  _bookingId: string,
  onChange: (assets: MedicalAsset[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  onChange([])
  return () => undefined
}

function randomId()`,
)
replaceBetween(
  medicalLibPath,
  'export async function loadMedicalAssetObjectUrl(',
  '\n}\n\nexport function newLabRow()',
  `export async function loadMedicalAssetObjectUrl(_asset: MedicalAsset) {
  throw new Error(
    'Ранее загруженные медицинские файлы помещены в карантин и недоступны участникам занятия.',
  )
}

export async function deleteMedicalAsset(_asset: MedicalAsset): Promise<void> {
  throw new Error(
    'Удаление карантинных медицинских файлов выполняется только администрацией.',
  )
}

export function newLabRow()`,
)

const boardPath = 'artifacts/medstart/components/live/ServerlessWhiteboard.tsx'
replaceOnce(
  boardPath,
  `  useEffect(() => {
    const cacheKey = \`medstart-board-\${bookingId}\`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as unknown
        if (Array.isArray(parsed)) setElements(parsed.filter(isBoardElement))
      }
    } catch {
      // Private mode can disable session storage.
    }

    return subscribeToWhiteboard(
      bookingId,
      (next) => {
        setElements(next.filter(isBoardElement))
        setSyncState(navigator.onLine ? 'saved' : 'offline')
      },
      () => setSyncState(navigator.onLine ? 'error' : 'offline'),
    )
  }, [bookingId])

  useEffect(() => {
    try {
      sessionStorage.setItem(
        \`medstart-board-\${bookingId}\`,
        JSON.stringify(elements.slice(-CACHE_LIMIT)),
      )
    } catch {
      // Private mode can disable session storage.
    }
  }, [bookingId, elements])
`,
  `  useEffect(
    () =>
      subscribeToWhiteboard(
        bookingId,
        (next) => {
          setElements(next.filter(isBoardElement))
          setSyncState(navigator.onLine ? 'saved' : 'offline')
        },
        () => setSyncState(navigator.onLine ? 'error' : 'offline'),
      ),
    [bookingId],
  )
`,
)

const verifyPath = 'scripts/verify-critical-hardening.mjs'
let verify = read(verifyPath)
verify = verify.replace(
  "if (whiteboard.includes('localStorage.')) {",
  "if (/localStorage\\.|sessionStorage\\./.test(whiteboard)) {",
)
verify = verify.replace(
  "'ServerlessWhiteboard.tsx: доска всё ещё сохраняется в localStorage'",
  "'ServerlessWhiteboard.tsx: доска всё ещё сохраняется в Web Storage'",
)
verify = verify.replace(
  "console.log('Critical hardening invariants: OK')",
  `requireText(
  'firestore.rules',
  /match \/bookings\/\\{bookingId\\}[\\s\\S]*?allow update: if false;/,
  'клиент всё ещё может напрямую менять статус занятия',
)
requireText(
  'artifacts/medstart/lib/bookings.ts',
  '/api/bookings/status',
  'статусы занятий не переведены на серверный API',
)
requireText(
  'artifacts/medstart/app/api/medical-workspace/save/route.ts',
  'WORKSPACE_CONFLICT',
  'нет защиты от конкурентной перезаписи медицинских данных',
)
requireText(
  'artifacts/medstart/app/api/medical-workspace/save/route.ts',
  'containsPotentialIdentifier',
  'нет серверной проверки возможных персональных данных пациента',
)
requireText(
  'storage.rules',
  /match \/medical-workspaces\/[\\s\\S]*?allow read: if isModerator\\(\\);/,
  'ранее загруженные медицинские файлы не помещены в карантин',
)

console.log('Critical hardening invariants: OK')`,
)
write(verifyPath, verify)

console.log('Critical hardening stage 2 applied successfully.')
