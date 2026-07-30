import { learnerTrackFor, tutorAudiencesFor } from './education'
import type { UserProfile } from './user-profile'

// Shared role-aware completion model for the authenticated student and tutor workspaces.
export interface ProfileCompletionResult {
  percent: number
  completed: number
  total: number
  missing: string[]
}

function filled(value: unknown) {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  return Boolean(String(value ?? '').trim())
}

export function getProfileCompletion(
  profile: UserProfile | null | undefined,
): ProfileCompletionResult {
  if (!profile) return { percent: 0, completed: 0, total: 0, missing: [] }

  const learnerTrack = learnerTrackFor(profile)
  const tutorAudiences =
    profile.role === 'tutor' ? tutorAudiencesFor(profile) : []
  const fields =
    profile.role === 'tutor'
      ? [
          ['Фотография', profile.avatar],
          ['Аудитория', tutorAudiences],
          ...(tutorAudiences.includes('school')
            ? [['Экзамены', profile.examTypes]]
            : []),
          ['Специализация', profile.specialization],
          ['Профессиональный статус', profile.title],
          ['Предметы', profile.subjects],
          ['Учреждение', profile.institution],
          ['Опыт', profile.experience],
          ['Описание подхода', profile.bio],
          ['Город', profile.city],
          ['Стоимость занятия', profile.lessonPrice],
          ['Продолжительность', profile.lessonDuration],
          ['Формат занятий', profile.lessonFormats],
          ['Часовой пояс', profile.timezone],
        ]
      : learnerTrack === 'school'
        ? [
            ['Фотография', profile.avatar],
            ['Класс', profile.schoolGrade],
            ['Экзамен', profile.schoolExam],
            ['Предметы', profile.subjects],
            [
              'Согласование с законным представителем',
              profile.schoolConsentConfirmed,
            ],
            ['Город', profile.city],
            ['Учебные цели', profile.bio],
            ['Часовой пояс', profile.timezone],
          ]
        : [
            ['Фотография', profile.avatar],
            ['Учебное заведение', profile.institution],
            ['Направление', profile.fieldOfStudy],
            ['Курс', profile.studyYear],
            ['Город', profile.city],
            ['Сложные дисциплины', profile.subjects],
            ['Учебные цели', profile.bio],
            ['Часовой пояс', profile.timezone],
          ]

  const missing = fields
    .filter(([, value]) => !filled(value))
    .map(([label]) => String(label))
  const total = fields.length
  const completed = total - missing.length

  return {
    percent: total ? Math.round((completed / total) * 100) : 100,
    completed,
    total,
    missing,
  }
}
