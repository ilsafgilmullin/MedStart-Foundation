export type LearnerTrack = 'medical' | 'school'
export type SchoolExam = 'oge' | 'ege'

export interface SchoolExamSubject {
  value: string
  label: string
  exams: SchoolExam[]
}

export const LEARNER_TRACK_LABELS: Record<LearnerTrack, string> = {
  medical: 'Студент медвуза',
  school: 'Школьник',
}

export const SCHOOL_EXAM_LABELS: Record<SchoolExam, string> = {
  oge: 'ОГЭ',
  ege: 'ЕГЭ',
}

export const SCHOOL_GRADES = [
  { value: '8', label: '8 класс', recommendedExam: 'oge' },
  { value: '9', label: '9 класс', recommendedExam: 'oge' },
  { value: '10', label: '10 класс', recommendedExam: 'ege' },
  { value: '11', label: '11 класс', recommendedExam: 'ege' },
] as const satisfies ReadonlyArray<{
  value: string
  label: string
  recommendedExam: SchoolExam
}>

// Перечень соответствует предметным направлениям ФИПИ для ОГЭ и ЕГЭ 2026.
export const SCHOOL_EXAM_SUBJECTS: SchoolExamSubject[] = [
  { value: 'Русский язык', label: 'Русский язык', exams: ['oge', 'ege'] },
  { value: 'Математика', label: 'Математика', exams: ['oge'] },
  {
    value: 'Математика (базовый уровень)',
    label: 'Математика — базовый уровень',
    exams: ['ege'],
  },
  {
    value: 'Математика (профильный уровень)',
    label: 'Математика — профильный уровень',
    exams: ['ege'],
  },
  { value: 'Физика', label: 'Физика', exams: ['oge', 'ege'] },
  { value: 'Химия', label: 'Химия', exams: ['oge', 'ege'] },
  { value: 'Информатика', label: 'Информатика', exams: ['oge', 'ege'] },
  { value: 'Биология', label: 'Биология', exams: ['oge', 'ege'] },
  { value: 'История', label: 'История', exams: ['oge', 'ege'] },
  { value: 'География', label: 'География', exams: ['oge', 'ege'] },
  { value: 'Обществознание', label: 'Обществознание', exams: ['oge', 'ege'] },
  { value: 'Литература', label: 'Литература', exams: ['oge', 'ege'] },
  {
    value: 'Английский язык',
    label: 'Английский язык',
    exams: ['oge', 'ege'],
  },
  {
    value: 'Немецкий язык',
    label: 'Немецкий язык',
    exams: ['oge', 'ege'],
  },
  {
    value: 'Французский язык',
    label: 'Французский язык',
    exams: ['oge', 'ege'],
  },
  {
    value: 'Испанский язык',
    label: 'Испанский язык',
    exams: ['oge', 'ege'],
  },
  { value: 'Китайский язык', label: 'Китайский язык', exams: ['ege'] },
]

export const MEDICAL_FIELDS = [
  { value: 'medicine', label: 'Лечебное дело' },
  { value: 'pediatrics', label: 'Педиатрия' },
  { value: 'dentistry', label: 'Стоматология' },
  { value: 'pharmacy', label: 'Фармация' },
  { value: 'nursing', label: 'Сестринское дело' },
  { value: 'other', label: 'Другое' },
] as const

export function subjectsForExam(exam: SchoolExam) {
  return SCHOOL_EXAM_SUBJECTS.filter((subject) => subject.exams.includes(exam))
}

export function isSchoolGradeCompatible(
  exam: SchoolExam,
  grade: string,
): boolean {
  return exam === 'oge'
    ? grade === '8' || grade === '9'
    : grade === '10' || grade === '11'
}

export function learnerTrackFor(
  profile:
    | {
        learnerTrack?: LearnerTrack
      }
    | null
    | undefined,
): LearnerTrack {
  return profile?.learnerTrack === 'school' ? 'school' : 'medical'
}

export function tutorAudiencesFor(profile: {
  tutorAudiences?: LearnerTrack[]
}): LearnerTrack[] {
  const audiences = profile.tutorAudiences?.filter(
    (item): item is LearnerTrack => item === 'medical' || item === 'school',
  )
  return audiences?.length ? [...new Set(audiences)] : ['medical']
}

export function examLabel(exam?: SchoolExam): string {
  return exam ? SCHOOL_EXAM_LABELS[exam] : ''
}
