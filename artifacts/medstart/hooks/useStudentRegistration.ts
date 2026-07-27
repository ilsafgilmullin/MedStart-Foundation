'use client'

import { useState, type FormEvent } from 'react'
import { MedStartAuthError, registerStudent } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { isStrongPassword } from '@/lib/password-policy'

function messageFor(error: unknown) {
  if (error instanceof MedStartAuthError) {
    switch (error.code) {
      case 'ACCOUNT_UNAVAILABLE':
        return 'Создать аккаунт с этими данными нельзя. Возможно, аккаунт уже создан — войдите или восстановите пароль.'
      case 'INVALID_REGISTRATION':
        return 'Проверьте заполненные данные и требования к паролю.'
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
  const [field, setField] = useState('medicine')
  const [year, setYear] = useState('1')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setError('')

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
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

    let navigationStarted = false
    try {
      setLoading(true)
      const normalizedEmail = email.trim().toLowerCase()
      const result = await registerStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
        fieldOfStudy: field,
        studyYear: year,
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
    field,
    setField,
    year,
    setYear,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    handleSubmit,
  }
}
