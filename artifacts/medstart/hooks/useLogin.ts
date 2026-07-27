'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FirebaseError } from 'firebase/app'

import {
  EmailVerificationRequiredError,
  login,
} from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

export function useLogin() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('passwordReset') === '1') {
      setVerificationNotice('Пароль изменён. Теперь войдите с новым паролем.')
    } else if (params.get('registered') === '1') {
      setVerificationNotice(
        'Аккаунт создан. Подтвердите почту по ссылке из письма, затем войдите.',
      )
    } else if (params.get('loggedOut') === '1') {
      setVerificationNotice('Вы безопасно вышли из аккаунта.')
    }
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError('')
    setVerificationNotice('')

    if (!email.trim() || !password) {
      setError('Заполните электронную почту и пароль.')
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      router.replace(ROUTES.DASHBOARD)
      router.refresh()
    } catch (err) {
      if (err instanceof EmailVerificationRequiredError) {
        if (err.verificationSent) setVerificationNotice(err.message)
        else setError(err.message)
      } else if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setError(
              'Неверная почта или пароль. Проверьте данные либо восстановите пароль.',
            )
            break

          case 'auth/invalid-email':
            setError('Некорректный адрес электронной почты.')
            break

          case 'auth/user-disabled':
            setError('Этот аккаунт отключён. Обратитесь в поддержку MedStart.')
            break

          case 'auth/too-many-requests':
            setError('Слишком много попыток входа. Повторите позже или восстановите пароль.')
            break

          case 'auth/network-request-failed':
            setError('Не удалось связаться с сервером. Проверьте интернет и повторите вход.')
            break

          case 'auth/operation-not-allowed':
            setError('Вход по почте временно недоступен. Обратитесь в поддержку MedStart.')
            break

          default:
            setError(`Не удалось выполнить вход (${err.code}).`)
        }
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Произошла неизвестная ошибка при входе.')
      }
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
    verificationNotice,

    handleSubmit,
  }
}
