'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MedStartAuthError, registerTutor } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { isStrongPassword } from '@/lib/password-policy'

function messageFor(error: unknown) {
  if (error instanceof MedStartAuthError) {
    switch (error.code) {
      case 'ACCOUNT_UNAVAILABLE':
        return 'Создать аккаунт с этими данными нельзя. Войдите или восстановите пароль.'
      case 'INVALID_REGISTRATION':
        return 'Проверьте заполненные данные и требования к паролю.'
      case 'TOO_MANY_REQUESTS':
        return 'Слишком много попыток регистрации. Подождите и повторите позже.'
      case 'AUTH_SERVICE_UNAVAILABLE':
        return 'Сервис регистрации временно недоступен. Повторите попытку позже.'
      default:
        return 'Не удалось создать профиль репетитора. Повторите попытку.'
    }
  }
  return error instanceof Error
    ? error.message
    : 'Не удалось создать профиль репетитора.'
}

export function useTutorRegistration() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
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

    try {
      setLoading(true)
      const result = await registerTutor({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
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
        bio: bio.trim(),
        password,
      })
      router.replace(
        `${ROUTES.LOGIN}?registered=1&tutor=1&email=${encodeURIComponent(email.trim().toLowerCase())}&verificationSent=${result.verificationSent ? '1' : '0'}`,
      )
      router.refresh()
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setLoading(false)
    }
  }

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
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
