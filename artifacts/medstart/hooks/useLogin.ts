'use client'

import { FormEvent, useEffect, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  EmailVerificationRequiredError,
  MedStartAuthError,
  login,
} from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

function messageFor(error: unknown) {
  if (error instanceof MedStartAuthError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Неверная почта или пароль. Проверьте данные либо восстановите пароль.'
      case 'ACCOUNT_UNAVAILABLE':
        return 'Вход в этот аккаунт недоступен. Обратитесь в поддержку MedStart.'
      case 'TOO_MANY_REQUESTS':
        return 'Слишком много попыток входа. Подождите и повторите позже.'
      case 'PROFILE_MISSING':
        return 'Аккаунт найден, но профиль MedStart повреждён. Не создавайте новый аккаунт — обратитесь в поддержку.'
      case 'AUTH_SERVICE_UNAVAILABLE':
        return 'Сервис авторизации временно недоступен. Проверьте интернет и повторите.'
      default:
        return 'Не удалось выполнить вход. Повторите попытку.'
    }
  }

  if (error instanceof FirebaseError) {
    if (error.code === 'auth/network-request-failed') {
      return 'Не удалось завершить защищённую сессию. Проверьте интернет и повторите.'
    }
    return 'Не удалось завершить вход. Повторите попытку.'
  }

  return error instanceof Error ? error.message : 'Не удалось выполнить вход.'
}

export function useLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedEmail = params.get('email')
    if (requestedEmail) setEmail(requestedEmail.trim().toLowerCase())

    if (params.get('passwordReset') === '1') {
      setVerificationNotice('Пароль изменён. Теперь войдите с новым паролем.')
    } else if (params.get('registered') === '1') {
      setVerificationNotice(
        params.get('verificationSent') === '0'
          ? 'Аккаунт создан, но письмо подтверждения пока не отправлено. Введите почту и пароль — сервер MedStart повторит отправку.'
          : 'Аккаунт создан. Подтвердите почту по ссылке из письма, затем войдите.',
      )
    } else if (params.get('loggedOut') === '1') {
      setVerificationNotice('Вы безопасно вышли из аккаунта.')
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError('')
    setVerificationNotice('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Заполните электронную почту и пароль.')
      return
    }

    let navigationStarted = false
    try {
      setLoading(true)
      await login(normalizedEmail, password)

      // A single hard navigation avoids a mobile Safari race between a route
      // transition and a simultaneous refresh of the current form.
      navigationStarted = true
      window.location.replace(ROUTES.DASHBOARD)
    } catch (caught) {
      if (caught instanceof EmailVerificationRequiredError) {
        if (caught.verificationSent) setVerificationNotice(caught.message)
        else setError(caught.message)
      } else {
        setError(messageFor(caught))
      }
    } finally {
      if (!navigationStarted) setLoading(false)
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
