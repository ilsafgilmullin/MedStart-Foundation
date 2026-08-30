'use client'

import { useState, type FormEvent } from 'react'
import { MedStartAuthError, registerStudent } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import {
  isSchoolGradeCompatible,
  subjectsForExam,
  type LearnerTrack,
  type SchoolExam,
} from '@/lib/education'
import { isStrongPassword } from '@/lib/password-policy'

function messageFor(error: unknown) {
  if (error instanceof MedStartAuthError) {
    switch (error.code) {
      case 'ACCOUNT_UNAVAILABLE':
        return 'Создать аккаунт с этими данными нельзя. Возможно, аккаунт уже создан — войдите или восстановите пароль.'
      case 'INVALID_REGISTRATION':
        return 'Проверьте заполненные данные и требования к паролю.'
      case 'SCHOOL_TRACK_DISABLED':
        return 'Школьный трек пока закрыт. Сейчас MedStart принимает студентов медвузов.'
      case 'TOO_MANY_REQUESTS':
        return 'Слишком много попыток регистрации. Подождите и повторите позже.'
      case 'AUTH_CONFIGURATION_ERROR':
        return 'Сервер MedStart не подключён к Firebase Admin. Администратору необходимо проверить Secret FIREBASE_SERVICE_ACCOUNT_JSON. Введённые данные сохранены.'
      case 'AUTH_SERVICE_UNAVAILABLE':
        return 'Сервис регистрации временно недоступен. Введённые данные сохранены — повторите попытку позже.'
      default:
        return 'Не удалось создать аккаунт. Введённые данные сохранены — повторите попытку.'
    }
  }
  return error instanceof Error ? error.message : 'Не удалось создать аккаунт.'
}

export function useStudentRegistration() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [learnerTrack, setLearnerTrack] = useState<LearnerTrack>('medical')
  const [field, setField] = useState('medicine')
  const [year, setYear] = useState('1')
  const [schoolGrade, setSchoolGradeState] = useState('9')
  const [schoolExam, setSchoolExamState] = useState<SchoolExam>('oge')
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([])
  const [schoolConsentConfirmed, setSchoolConsentConfirmed] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setSchoolExam(exam: SchoolExam) {
    const allowed = new Set(
      subjectsForExam(exam).map((subject) => subject.value),
    )
    setSchoolExamState(exam)
    setSchoolGradeState((current) =>
      isSchoolGradeCompatible(exam, current)
        ? current
        : exam === 'oge'
          ? '9'
          : '11',
    )
    setSchoolSubjects((current) =>
      current.filter((subject) => allowed.has(subject)),
    )
  }

  function setSchoolGrade(grade: string) {
    const exam: SchoolExam = grade === '8' || grade === '9' ? 'oge' : 'ege'
    const allowed = new Set(
      subjectsForExam(exam).map((subject) => subject.value),
    )
    setSchoolGradeState(grade)
    setSchoolExamState(exam)
    setSchoolSubjects((current) =>
      current.filter((subject) => allowed.has(subject)),
    )
  }

  function toggleSchoolSubject(subject: string) {
    setSchoolSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Заполните обязательные поля.')
      return
    }
    if (
      learnerTrack === 'school' &&
      !isSchoolGradeCompatible(schoolExam, schoolGrade)
    ) {
      setError('Для ОГЭ выберите 8–9 класс, для ЕГЭ — 10–11 класс.')
      return
    }
    if (learnerTrack === 'school' && schoolSubjects.length === 0) {
      setError('Выберите хотя бы один предмет для подготовки.')
      return
    }
    if (learnerTrack === 'school' && !schoolConsentConfirmed) {
      setError(
        'Подтвердите, что вам уже исполнилось 18 лет или обучение согласовано с законным представителем.',
      )
      return
    }
    if (!isStrongPassword(password)) {
      setError('Пароль должен содержать минимум 10 символов, букву и цифру.')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.')
      return
    }

    let navigationStarted = false
    try {
      setLoading(true)
      const normalizedEmail = email.trim().toLowerCase()
      const result = await registerStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
        learnerTrack,
        fieldOfStudy: learnerTrack === 'medical' ? field : '',
        studyYear: learnerTrack === 'medical' ? year : '',
        schoolGrade: learnerTrack === 'school' ? schoolGrade : '',
        schoolExam,
        subjects: learnerTrack === 'school' ? schoolSubjects : [],
        schoolConsentConfirmed:
          learnerTrack === 'school' && schoolConsentConfirmed,
      })

      const nextUrl = `${ROUTES.LOGIN}?registered=1&email=${encodeURIComponent(normalizedEmail)}&verificationSent=${result.verificationSent ? '1' : '0'}`
      navigationStarted = true
      window.location.replace(nextUrl)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      if (!navigationStarted) setLoading(false)
    }
  }

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    learnerTrack,
    setLearnerTrack,
    field,
    setField,
    year,
    setYear,
    schoolGrade,
    setSchoolGrade,
    schoolExam,
    setSchoolExam,
    schoolSubjects,
    toggleSchoolSubject,
    schoolConsentConfirmed,
    setSchoolConsentConfirmed,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    handleSubmit,
  }
}
