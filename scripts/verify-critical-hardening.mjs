import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function requireText(path, pattern, message) {
  const content = read(path)
  const ok = pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern)
  if (!ok) throw new Error(`${path}: ${message}`)
}

requireText(
  'firestore.rules',
  'function hasUsableAccount()',
  'отсутствует централизованная проверка заблокированных аккаунтов',
)
requireText(
  'firestore.rules',
  /match \/bookings\/\{bookingId\}[\s\S]*?allow create: if false;/,
  'клиент всё ещё может создавать заявки напрямую',
)
requireText(
  'firestore.rules',
  /match \/medicalWorkspaces\/\{bookingId\}[\s\S]*?allow create, update: if false;/,
  'клиент всё ещё может напрямую менять медицинское пространство',
)
requireText(
  'firestore.rules',
  /match \/assets\/\{assetId\}[\s\S]*?allow create: if false;/,
  'клиент всё ещё может создавать медицинские метаданные',
)
requireText(
  'storage.rules',
  /match \/medical-workspaces\/\{bookingId\}\/\{userId\}\/\{fileName\}[\s\S]*?allow create: if false;/,
  'загрузка пользовательских медицинских файлов не заблокирована',
)
requireText(
  'artifacts/medstart/lib/firebase.ts',
  'memoryLocalCache()',
  'Firestore не переведён на память',
)

const firebaseClient = read('artifacts/medstart/lib/firebase.ts')
if (/persistentLocalCache|persistentMultipleTabManager/.test(firebaseClient)) {
  throw new Error(
    'artifacts/medstart/lib/firebase.ts: приватные данные всё ещё сохраняются в IndexedDB',
  )
}

const whiteboard = read('artifacts/medstart/components/live/ServerlessWhiteboard.tsx')
if (whiteboard.includes('localStorage.')) {
  throw new Error(
    'ServerlessWhiteboard.tsx: доска всё ещё сохраняется в localStorage',
  )
}

requireText(
  'artifacts/medstart/lib/bookings.ts',
  '/api/bookings/create',
  'создание заявок не переведено на серверный API',
)
requireText(
  'artifacts/medstart/lib/medical-workspace.ts',
  '/api/medical-workspace/save',
  'медицинские данные не переведены на серверную валидацию',
)
requireText(
  'artifacts/medstart/app/api/bookings/create/route.ts',
  'SLOT_CONFLICT',
  'сервер не контролирует пересечения занятий',
)
requireText(
  'artifacts/medstart/app/api/medical-workspace/save/route.ts',
  "workspaceRef.collection('revisions')",
  'нет журнала ревизий медицинских данных',
)
requireText(
  '.github/workflows/medstart-ci.yml',
  '- main',
  'основная ветка не включена в CI',
)

console.log('Critical hardening invariants: OK')
