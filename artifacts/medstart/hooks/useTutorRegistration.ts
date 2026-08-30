'use client'

import { useState, type FormEvent } from 'react'
import { MedStartAuthError, registerTutor } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import type { LearnerTrack, SchoolExam } from '@/lib/education'
import { isStrongPassword } from '@/lib/password-policy'

function messageFor(error: unknown) {
  if (error instanceof MedStartAuthError) {
    switch (error.code) {
      case 'ACCOUNT_UNAVAILABLE':
        return 'Создать аккаунт с этими данными нельзя. Возможно, аккаунт уже создан — войдите или восстановите пароль.'
      case 'INVALID_REGISTRATION':
        return 'Проверьте заполненные данные и требования к паролю.'
      case 'SCHOOL_TRACK_DISABLED':
        return 'Школьный трек пока закрыт. Выберите преподавание для студентов медвузов.'
      case 'TOO_MANY_REQUESTS':
        return 'Слишком много попыток регистрации. Подождите и повторите позже.'
      case 'AUTH_CONFIGURATION_ERROR':
        return 'Сервер MedStart не подключён к Firebase Admin. Администратору необходимо проверить Secret FIREBASE_SERVICE_ACCOUNT_JSON. Введённые данные сохранены.'
      case 'AUTH_SERVICE_UNAVAILABLE':
        return 'Сервис регистрации временно недоступен. Введённые данные сохранены — повторите попытку позже.'
      default:
        return 'Не удалось создать профиль репетитора. Введённые данные сохранены.'
    }
  }
  return error instanceof Error
    ? error.message
    : 'Не удалось создать профиль репетитора.'
}

export function useTutorRegistration() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [tutorAudiences, setTutorAudiences] = useState<LearnerTrack[]>([
    'medical',
  ])
  const [examTypes, setExamTypes] = useState<SchoolExam[]>([])
  const [specialization, setSpecialization] = useState('')
  const [subjects, setSubjects] = useState('')
  const [institution, setInstitution] = useState('')
  const [experience, setExperience] = useState('')
  const [city, setCity] = useState('')
  const [lessonPrice, setLessonPrice] = useState('')
  const [lessonDuration, setLessonDuration] = useState('60')
  const [online, setOnline] = useState(true)
  const [inPerson, setInPerson] = useState(false)
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleAudience(audience: LearnerTrack) {
    setTutorAudiences((current) =>
      current.includes(audience)
        ? current.filter((item) => item !== audience)
        : [...current, audience],
    )
  }

  function toggleExamType(exam: SchoolExam) {
    setExamTypes((current) =>
      current.includes(exam)
        ? current.filter((item) => item !== exam)
        : [...current, exam],
    )
  }

  function addSuggestedSubject(subject: string) {
    setSubjects((current) => {
      const items = current
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      if (
        items.some(
          (item) =>
            item.toLocaleLowerCase('ru-RU') ===
            subject.toLocaleLowerCase('ru-RU'),
        )
      ) {
        return current
      }
      return [...items, subject].join(', ')
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !specialization.trim() ||
      !password
    ) {
      setError('Заполните обязательные поля.')
      return
    }
    if (tutorAudiences.length === 0) {
      setError('Выберите, с кем вы проводите занятия.')
      return
    }
    if (tutorAudiences.includes('school') && examTypes.length === 0) {
      setError('Укажите, готовите ли вы к ОГЭ, ЕГЭ или к обоим экзаменам.')
      return
    }
    if (tutorAudiences.includes('school') && !subjects.trim()) {
      setError('Укажите хотя бы один школьный предмет.')
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
    if (!online && !inPerson) {
      setError('Выберите хотя бы один формат занятий.')
      return
    }

    let navigationStarted = false
    try {
      setLoading(true)
      const normalizedEmail = email.trim().toLowerCase()
      const result = await registerTutor({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        specialization: specialization.trim(),
        subjects: subjects
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        institution: institution.trim(),
        experience: experience.trim(),
        city: city.trim(),
        lessonPrice: Math.max(0, Number(lessonPrice) || 0),
        lessonDuration: Math.min(
          180,
          Math.max(30, Number(lessonDuration) || 60),
        ),
        lessonFormats: [
          ...(online ? (['online'] as const) : []),
          ...(inPerson ? (['in_person'] as const) : []),
        ],
        tutorAudiences,
        examTypes: tutorAudiences.includes('school') ? examTypes : [],
        bio: bio.trim(),
        password,
      })

      const nextUrl = `${ROUTES.LOGIN}?registered=1&tutor=1&email=${encodeURIComponent(normalizedEmail)}&verificationSent=${result.verificationSent ? '1' : '0'}`
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
    tutorAudiences,
    toggleAudience,
    examTypes,
    toggleExamType,
    addSuggestedSubject,
    specialization,
    setSpecialization,
    subjects,
    setSubjects,
    institution,
    setInstitution,
    experience,
    setExperience,
    city,
    setCity,
    lessonPrice,
    setLessonPrice,
    lessonDuration,
    setLessonDuration,
    online,
    setOnline,
    inPerson,
    setInPerson,
    bio,
    setBio,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    handleSubmit,
  }
}
