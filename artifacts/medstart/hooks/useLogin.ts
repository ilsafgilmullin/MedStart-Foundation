'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { FirebaseError } from 'firebase/app'

import { login } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

function getLoginError(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Неверная электронная почта или пароль.'
      case 'auth/invalid-email':
        return 'Некорректный адрес электронной почты.'
      case 'auth/too-many-requests':
        return 'Слишком много попыток входа. Попробуйте позже.'
      case 'auth/network-request-failed':
        return 'Нет соединения с сервером. Проверьте интернет.'
      default:
        return 'Не удалось выполнить вход.'
    }
  }

  return error instanceof Error
    ? error.message
    : 'Произошла неизвестная ошибка.'
}

export function useLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Заполните все поля.')
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      router.replace(ROUTES.DASHBOARD)
    } catch (caught) {
      setError(getLoginError(caught))
    } finally {
      setLoading(false)
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    handleSubmit,
  }
}
