'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FirebaseError } from 'firebase/app'
import { registerStudent } from '@/lib/auth'
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
        return `Не удалось создать аккаунт (${error.code}).`
    }
  }
  return error instanceof Error ? error.message : 'Не удалось создать аккаунт.'
}

export function useStudentRegistration() {
  const router = useRouter()
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
    setError('')
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password)
      return setError('Заполните обязательные поля.')
    if (password.length < 8)
      return setError('Пароль должен содержать не менее 8 символов.')
    if (password !== confirmPassword) return setError('Пароли не совпадают.')

    try {
      setLoading(true)
      const result = await registerStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        fieldOfStudy: field,
        studyYear: year,
      })
      router.replace(
        `${ROUTES.LOGIN}?registered=1&verificationSent=${result.verificationSent ? '1' : '0'}`,
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
