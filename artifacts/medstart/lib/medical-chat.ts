import type {
  MedicalMessageTag,
  MedicalReactionCode,
} from './domain'

export const MEDICAL_REACTIONS: Array<{
  code: MedicalReactionCode
  emoji: string
  label: string
}> = [
  { code: 'heart', emoji: '🫀', label: 'Сердце' },
  { code: 'brain', emoji: '🧠', label: 'Понял' },
  { code: 'stethoscope', emoji: '🩺', label: 'Разберём' },
  { code: 'dna', emoji: '🧬', label: 'Интересно' },
  { code: 'pill', emoji: '💊', label: 'Полезно' },
  { code: 'check', emoji: '✅', label: 'Готово' },
]

export const MEDICAL_TAGS: Array<{
  value: Exclude<MedicalMessageTag, ''>
  label: string
  shortLabel: string
  emoji: string
  className: string
}> = [
  {
    value: 'clinical_case',
    label: 'Клинический случай',
    shortLabel: 'Клинический случай',
    emoji: '🩻',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  },
  {
    value: 'homework',
    label: 'Домашнее задание',
    shortLabel: 'Задание',
    emoji: '📋',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    value: 'ecg',
    label: 'Разбор ЭКГ',
    shortLabel: 'ЭКГ',
    emoji: '📈',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  {
    value: 'lab',
    label: 'Лабораторные показатели',
    shortLabel: 'Анализы',
    emoji: '🧪',
    className: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  {
    value: 'medication',
    label: 'Фармакология',
    shortLabel: 'Препарат',
    emoji: '💊',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  {
    value: 'important',
    label: 'Важно запомнить',
    shortLabel: 'Важно',
    emoji: '⚕️',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
]

export const MEDICAL_TEMPLATES: Array<{
  label: string
  tag: Exclude<MedicalMessageTag, ''>
  text: string
}> = [
  {
    label: 'Запросить ЭКГ',
    tag: 'ecg',
    text: 'Прикрепите ЭКГ без ФИО, номера истории болезни и других персональных данных пациента. Укажите скорость записи и усиление.',
  },
  {
    label: 'Разобрать анализы',
    tag: 'lab',
    text: 'Пришлите значения анализов с единицами измерения и референсными интервалами. Удалите персональные данные пациента.',
  },
  {
    label: 'Домашнее задание',
    tag: 'homework',
    text: 'Домашнее задание: сформулируйте основной диагноз, проведите дифференциальную диагностику и составьте план обследования.',
  },
  {
    label: 'Клинический случай',
    tag: 'clinical_case',
    text: 'Опишите клинический случай по структуре: жалобы, анамнез, объективные данные, исследования, предварительный диагноз и вопросы для разбора.',
  },
  {
    label: 'Проверить препарат',
    tag: 'medication',
    text: 'Укажите международное непатентованное наименование, дозировку, путь введения, показания и возможные противопоказания.',
  },
  {
    label: 'Ключевой вывод',
    tag: 'important',
    text: 'Важно запомнить: ',
  },
]

export const MEDICAL_TEXT_EMOJIS = [
  '🩺',
  '🫀',
  '🧠',
  '🫁',
  '🦴',
  '🧬',
  '🧪',
  '💊',
  '💉',
  '🩻',
  '📈',
  '⚕️',
  '✅',
  '❗',
]

export function medicalTagMeta(tag: MedicalMessageTag) {
  return MEDICAL_TAGS.find((item) => item.value === tag) ?? null
}

export function reactionMeta(code: MedicalReactionCode) {
  return MEDICAL_REACTIONS.find((item) => item.code === code) ?? MEDICAL_REACTIONS[0]
}

export function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function messagePreview(kind: string, text: string, fileName = '') {
  if (kind === 'voice') return '🎙 Голосовое сообщение'
  if (kind === 'video_note') return '◉ Видеокружок'
  if (kind === 'file') return `📎 ${fileName || 'Вложение'}`
  if (kind === 'medical_note') return `⚕️ ${text}`.slice(0, 2_000)
  return text.slice(0, 2_000)
}
