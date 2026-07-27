'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'

type HealthState =
  | { status: 'checking' }
  | { status: 'healthy' }
  | { status: 'configuration-error' }
  | { status: 'unavailable' }

interface HealthPayload {
  ok?: boolean
  code?: string
}

export function AuthHealthBanner() {
  const [state, setState] = useState<HealthState>({ status: 'checking' })

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 10_000)

    void fetch('/api/health/auth', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as HealthPayload
        if (response.ok && payload.ok) {
          setState({ status: 'healthy' })
          return
        }
        setState({
          status:
            payload.code === 'AUTH_CONFIGURATION_ERROR'
              ? 'configuration-error'
              : 'unavailable',
        })
      })
      .catch(() => setState({ status: 'unavailable' }))
      .finally(() => window.clearTimeout(timer))

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [])

  if (state.status === 'healthy') return null

  if (state.status === 'checking') {
    return (
      <div className="mb-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
        Проверяем подключение сервера авторизации…
      </div>
    )
  }

  const configurationError = state.status === 'configuration-error'
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Сервер авторизации сейчас не готов.</p>
        <p className="mt-1">
          {configurationError
            ? 'Не настроен серверный доступ Firebase. Администратору MedStart необходимо проверить Secret FIREBASE_SERVICE_ACCOUNT_JSON.'
            : 'Не удалось проверить Firebase Auth и профиль владельца. Повторите после перезапуска проекта.'}
        </p>
      </div>
    </div>
  )
}
