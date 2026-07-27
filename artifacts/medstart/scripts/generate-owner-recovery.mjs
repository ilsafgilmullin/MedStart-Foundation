import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { writeFile } from 'node:fs/promises'

const PROJECT_ID = 'medstart-e9bfe'
const OWNER_UID = 'm8JbbeeXMmZzywUwHboOyMm9MnG2'
const OWNER_EMAIL = 'ilsafgilmullin@yandex.ru'

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
}

const auth = getAuth()
const user = await auth.getUser(OWNER_UID)
const actualEmail = (user.email ?? '').trim().toLowerCase()
if (actualEmail !== OWNER_EMAIL) {
  throw new Error('Owner identity safety check failed; recovery link was not generated.')
}
if (user.disabled) throw new Error('Owner account is disabled; recovery link was not generated.')

const resetLink = await auth.generatePasswordResetLink(OWNER_EMAIL)
await writeFile(
  'owner-password-recovery.txt',
  [
    'MedStart owner password recovery',
    `Generated: ${new Date().toISOString()}`,
    'This is a one-time private link. Open it, set a new password, then delete this file.',
    '',
    resetLink,
    '',
  ].join('\n'),
  'utf8',
)

console.log('OWNER_RECOVERY_LINK_GENERATED=true')
