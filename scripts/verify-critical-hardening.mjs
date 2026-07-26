import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function requireText(path, text, message) {
  if (!read(path).includes(text)) throw new Error(path + ': ' + message)
}

requireText(
  'firestore.rules',
  'function hasUsableAccount()',
  'отсутствует отзыв доступа для заблокированных аккаунтов',
)
requireText(
  'firestore.rules',
  '// Создание выполняется только серверным API',
  'клиент всё ещё может создавать заявки напрямую',
)
requireText(
  'firestore.rules',
  '// Статусы меняет только серверный API',
  'клиент всё ещё может напрямую менять статус занятия',
)
requireText(
  'firestore.rules',
  '// Медицинские поля записывает только сервер',
  'клиент всё ещё может напрямую менять медицинское пространство',
)
requireText(
  'firestore.rules',
  '// Ранее загруженные пользовательские файлы помещены в карантин.',
  'медицинские метаданные не помещены в карантин',
)
requireText(
  'storage.rules',
  '// Все ранее загруженные медицинские файлы помещены в карантин.',
  'медицинские файлы не помещены в карантин',
)
requireText(
  'artifacts/medstart/lib/firebase.ts',
  'memoryLocalCache()',
  'Firestore не переведён на память',
)

const firebaseClient = read('artifacts/medstart/lib/firebase.ts')
if (
  firebaseClient.includes('persistentLocalCache') ||
  firebaseClient.includes('persistentMultipleTabManager')
) {
  throw new Error('firebase.ts: приватные данные всё ещё сохраняются в IndexedDB')
}

const whiteboard = read(
  'artifacts/medstart/components/live/ServerlessWhiteboard.tsx',
)
if (whiteboard.includes('localStorage.') || whiteboard.includes('sessionStorage.')) {
  throw new Error('ServerlessWhiteboard.tsx: доска сохраняется в Web Storage')
}

requireText(
  'artifacts/medstart/lib/bookings.ts',
  '/api/bookings/create',
  'создание заявок не переведено на серверный API',
)
requireText(
  'artifacts/medstart/lib/bookings.ts',
  '/api/bookings/status',
  'статусы занятий не переведены на серверный API',
)
requireText(
  'artifacts/medstart/app/api/bookings/create/route.ts',
  "where('studentUid', '==', decoded.uid)",
  'не проверяются пересечения занятий студента',
)
requireText(
  'artifacts/medstart/lib/medical-workspace.ts',
  '/api/medical-workspace/save',
  'медицинские данные не переведены на серверную валидацию',
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
  'artifacts/medstart/app/api/medical-workspace/save/route.ts',
  "workspaceRef.collection('revisions')",
  'нет журнала ревизий медицинских данных',
)

console.log('Critical hardening invariants: OK')
