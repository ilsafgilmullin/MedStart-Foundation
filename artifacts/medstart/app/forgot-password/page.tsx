'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, MailCheck } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell'
import { useHydrated } from '@/hooks/useHydrated'
import { MedStartAuthError, resetPassword } from '@/lib/auth'

function messageFor(error: unknown) {
  if (error instanceof MedStartAuthError) {
    switch (error.code) {
      case 'INVALID_EMAIL':
        return 'Проверьте адрес электронной почты.'
      case 'TOO_MANY_REQUESTS':
        return 'Слишком много запросов. Подождите и повторите позже.'
      case 'PASSWORD_AUTH_DISABLED':
        return 'Восстановление пароля временно отключено.'
      case 'AUTH_SERVICE_UNAVAILABLE':
        return 'Сервис авторизации временно недоступен. Повторите позже.'
      default:
        return 'Не удалось отправить письмо. Повторите позже.'
    }
  }
  return error instanceof Error ? error.message : 'Не удалось отправить письмо.'
}

export default function ForgotPasswordPage() {
  const hydrated = useHydrated()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const disabled = loading || !hydrated

  useEffect(() => {
    const requestedEmail = new URLSearchParams(window.location.search).get('email')
    if (requestedEmail) setEmail(requestedEmail.trim().toLowerCase())
  }, [])

  async function requestReset() {
    if (disabled) return
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Введите адрес электронной почты.')
      return
    }

    try {
      setLoading(true)
      await resetPassword(normalizedEmail)
      setEmail(normalizedEmail)
      setSent(true)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void requestReset()
  }

  return (
    <AuthShell
      eyebrow="Восстановление доступа"
      title={sent ? 'Проверьте почту' : 'Задайте новый пароль'}
      description="Запрос обрабатывается сервером MedStart. Мы не раскрываем, зарегистрирован ли указанный адрес."
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться ко входу
        </Link>
      }
    >
      {sent ? (
        <div aria-live="polite">
          <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-teal-950">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-teal-700" />
              <div>
                <h2 className="font-bold">Запрос принят</h2>
                <p className="mt-2 text-sm leading-6">
                  Если аккаунт с адресом <strong>{email}</strong> существует, письмо для смены пароля будет отправлено.
                </p>
              </div>
            </div>
          </div>

          <ol className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            <li>1. Проверьте «Входящие», «Спам» и «Рассылки».</li>
            <li>2. Откройте только самое новое письмо.</li>
            <li>3. Установите новый пароль и вернитесь в MedStart.</li>
          </ol>

          {error && (
            <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => void requestReset()}
            className="mt-5 ms-btn ms-btn-secondary ms-btn-lg ms-btn-block disabled:cursor-wait"
          >
            {loading ? (
              <>
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Отправляем…
              </>
            ) : (
              'Отправить ещё раз'
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Электронная почта
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="email"
              required
              disabled={disabled}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'reset-error' : undefined}
              className={authInputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.ru"
            />
          </label>

          {!hydrated && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
            >
              Подключаем защищённое восстановление доступа…
            </p>
          )}

          {error && (
            <p
              id="reset-error"
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={disabled}
            aria-busy={loading}
            className={authPrimaryButtonClass}
          >
            {loading ? (
              <>
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Отправляем запрос…
              </>
            ) : hydrated ? (
              'Получить ссылку'
            ) : (
              'Подключаем восстановление…'
            )}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
