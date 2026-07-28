import { readFileSync, writeFileSync } from 'node:fs'

function patch(path, replacements) {
  let source = readFileSync(path, 'utf8')
  let changed = false
  for (const [before, after, label] of replacements) {
    if (source.includes(after)) continue
    if (!source.includes(before)) {
      throw new Error(`${path}: не найден маркер ${label}`)
    }
    source = source.replace(before, after)
    changed = true
  }
  if (changed) writeFileSync(path, source)
  return changed
}

const changed = []

if (patch('artifacts/medstart/components/messages/MedicalMessenger.tsx', [
  [
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'",
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'\nimport PresenceBadge from '@/components/presence/PresenceBadge'",
    'import PresenceBadge',
  ],
  [
    "      participants,\n    }\n  }\n  const other = participants.find((item) => item.uid !== ownUid) || participants[0]",
    "      participants,\n      presenceUid: '',\n    }\n  }\n  const other = participants.find((item) => item.uid !== ownUid) || participants[0]",
    'moderator presenceUid',
  ],
  [
    "    initials: initials(other?.name || 'MedStart'),\n    participants,",
    "    initials: initials(other?.name || 'MedStart'),\n    presenceUid: other?.uid || '',\n    participants,",
    'counterpart presenceUid',
  ],
  [
    "                  <p className=\"mt-1 truncate text-sm text-slate-500\">\n                    {conversation.lastSenderUid === ownUid && 'Вы: '}\n                    {conversation.lastMessage || 'Диалог создан'}\n                  </p>\n                  {moderatorMode && (",
    "                  <p className=\"mt-1 truncate text-sm text-slate-500\">\n                    {conversation.lastSenderUid === ownUid && 'Вы: '}\n                    {conversation.lastMessage || 'Диалог создан'}\n                  </p>\n                  {!moderatorMode && item.presenceUid && (\n                    <PresenceBadge uid={item.presenceUid} compact className=\"mt-1\" />\n                  )}\n                  {moderatorMode && (",
    'conversation list status',
  ],
  [
    "        <h2 className=\"truncate font-black text-slate-950\">{item.title}</h2>\n        <p className=\"truncate text-xs text-slate-500\">{item.subtitle}</p>",
    "        <h2 className=\"truncate font-black text-slate-950\">{item.title}</h2>\n        {!moderatorMode && item.presenceUid ? (\n          <PresenceBadge uid={item.presenceUid} compact />\n        ) : (\n          <p className=\"truncate text-xs text-slate-500\">{item.subtitle}</p>\n        )}",
    'conversation header status',
  ],
])) changed.push('messages')

if (patch('artifacts/medstart/app/dashboard/tutors/page.tsx', [
  [
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'",
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'\nimport PresenceBadge from '@/components/presence/PresenceBadge'",
    'tutors import',
  ],
  [
    "                    <p className=\"mt-1 line-clamp-2 text-sm font-bold text-teal-700\">\n                      {tutor.specialization || 'Медицинский преподаватель'}\n                    </p>",
    "                    <p className=\"mt-1 line-clamp-2 text-sm font-bold text-teal-700\">\n                      {tutor.specialization || 'Медицинский преподаватель'}\n                    </p>\n                    <PresenceBadge uid={tutor.uid} compact className=\"mt-2\" />",
    'tutor card status',
  ],
])) changed.push('tutors')

if (patch('artifacts/medstart/app/dashboard/students/page.tsx', [
  [
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'",
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'\nimport PresenceBadge from '@/components/presence/PresenceBadge'",
    'students import',
  ],
  [
    "                    <h2 className=\"truncate text-lg font-black text-slate-950\">{student.name}</h2>\n                    <p className=\"mt-1 text-sm text-slate-500\">",
    "                    <h2 className=\"truncate text-lg font-black text-slate-950\">{student.name}</h2>\n                    <PresenceBadge uid={student.uid} compact className=\"mt-1\" />\n                    <p className=\"mt-1 text-sm text-slate-500\">",
    'student card status',
  ],
  [
    "              <h2 className=\"mt-2 text-2xl font-black text-slate-950\">{selected.name}</h2>",
    "              <h2 className=\"mt-2 text-2xl font-black text-slate-950\">{selected.name}</h2>\n              <PresenceBadge uid={selected.uid} className=\"mt-2\" />",
    'student detail status',
  ],
])) changed.push('students')

if (patch('artifacts/medstart/app/dashboard/profile/page.tsx', [
  [
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'",
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'\nimport PresenceBadge from '@/components/presence/PresenceBadge'",
    'profile import',
  ],
  [
    "          <h1 className=\"mt-4 text-3xl font-black sm:text-4xl\">",
    "          {user && <PresenceBadge uid={user.uid} className=\"mt-4\" />}\n          <h1 className=\"mt-4 text-3xl font-black sm:text-4xl\">",
    'own profile status',
  ],
])) changed.push('profile')

if (patch('artifacts/medstart/app/dashboard/admin/page.tsx', [
  [
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'",
    "import ProfilePhoto from '@/components/dashboard/ProfilePhoto'\nimport PresenceBadge from '@/components/presence/PresenceBadge'",
    'admin import',
  ],
  [
    "                      <h3 className=\"text-xl font-black text-slate-950\">{user.displayName}</h3>\n                      <span className=\"rounded-full bg-amber-100",
    "                      <h3 className=\"text-xl font-black text-slate-950\">{user.displayName}</h3>\n                      <PresenceBadge uid={user.uid} compact />\n                      <span className=\"rounded-full bg-amber-100",
    'moderation status',
  ],
])) changed.push('admin')

if (patch('artifacts/medstart/app/dashboard/settings/page.tsx', [
  [
    "import { resendEmailVerification, resetPassword } from '@/lib/auth'",
    "import { resendEmailVerification, resetPassword } from '@/lib/auth'\nimport { setPresenceVisibility } from '@/lib/presence'",
    'settings presence import',
  ],
  [
    "  const [timezone, setTimezone] = useState('Europe/Moscow')",
    "  const [timezone, setTimezone] = useState('Europe/Moscow')\n  const [presenceVisible, setPresenceVisible] = useState(true)",
    'settings state',
  ],
  [
    "  useEffect(() => {\n    setUiPreferences(readUiPreferences())\n  }, [])",
    "  useEffect(() => {\n    setUiPreferences(readUiPreferences())\n    setPresenceVisible(window.localStorage.getItem('medstart-presence-visible') !== 'false')\n  }, [])",
    'settings initial privacy',
  ],
  [
    "  async function saveCloudSettings() {",
    "  async function changePresenceVisibility(next: boolean) {\n    setPresenceVisible(next)\n    setError('')\n    setMessage('')\n    try {\n      await setPresenceVisibility(next ? 'everyone' : 'hidden')\n      window.localStorage.setItem('medstart-presence-visible', String(next))\n      setMessage(next ? 'Статус активности виден пользователям MedStart.' : 'Точное время активности скрыто.')\n    } catch (caught) {\n      setPresenceVisible(!next)\n      setError(caught instanceof Error ? caught.message : 'Не удалось изменить видимость статуса.')\n    }\n  }\n\n  async function saveCloudSettings() {",
    'privacy action',
  ],
  [
    "      <section className=\"rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7\">\n        <div className=\"flex items-start gap-3\">\n          <div className=\"rounded-2xl bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100\">\n            <Clock3 className=\"h-6 w-6\" />",
    "      <section className=\"rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm sm:p-7\">\n        <div className=\"flex items-start justify-between gap-5\">\n          <div>\n            <h2 className=\"text-xl font-black text-slate-950\">Статус присутствия</h2>\n            <p className=\"mt-1 max-w-2xl text-sm leading-6 text-slate-500\">\n              Показывает «в сети», «недавно» или время последней активности в сообщениях, каталоге и профилях.\n            </p>\n          </div>\n          <button\n            type=\"button\"\n            role=\"switch\"\n            aria-checked={presenceVisible}\n            data-active={presenceVisible}\n            onClick={() => void changePresenceVisibility(!presenceVisible)}\n            className=\"ms-switch shrink-0\"\n          >\n            <span className=\"ms-switch-thumb\" />\n          </button>\n        </div>\n        <div className=\"mt-5 rounded-2xl border border-emerald-100 bg-white p-4 text-sm text-slate-600\">\n          {presenceVisible\n            ? 'Ваш статус виден активным пользователям MedStart. При закрытии приложения онлайн погаснет автоматически.'\n            : 'Другие пользователи увидят только «Статус скрыт». Владелец не получает скрытого точного времени через интерфейс.'}\n        </div>\n      </section>\n\n      <section className=\"rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7\">\n        <div className=\"flex items-start gap-3\">\n          <div className=\"rounded-2xl bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100\">\n            <Clock3 className=\"h-6 w-6\" />",
    'privacy section',
  ],
])) changed.push('settings')

console.log(`Presence surface patch complete: ${changed.join(', ') || 'already applied'}`)
