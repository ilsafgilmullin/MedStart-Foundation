'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FirebaseError } from 'firebase/app'
import { registerTutor } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

function messageFor(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Аккаунт с такой почтой уже существует. Войдите или восстановите пароль.'
      case 'auth/invalid-email':
        return 'Проверьте адрес электронной почты.'
      case 'auth/weak-password':
        return 'Пароль должен содержать не менее 8 символов.'
      case 'auth/network-request-failed':
        return 'Не удалось связаться с сервером. Проверьте интернет и повторите.'
      case 'auth/operation-not-allowed':
        return 'Регистрация по почте временно недоступна. Обратитесь в поддержку MedStart.'
      case 'auth/too-many-requests':
        return 'Слишком много попыток. Подождите и повторите позже.'
      default:
        return `Не удалось создать профиль репетитора (${error.code}).`
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
    setError('')
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !specialization.trim() ||
      !password
    )
      return setError('Заполните обязательные поля.')
    if (password.length < 8)
      return setError('Пароль должен содержать не менее 8 символов.')
    if (password !== confirmPassword) return setError('Пароли не совпадают.')
    if (!online && !inPerson)
      return setError('Выберите хотя бы один формат занятий.')

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
        `${ROUTES.LOGIN}?registered=1&tutor=1&verificationSent=${result.verificationSent ? '1' : '0'}`,
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
