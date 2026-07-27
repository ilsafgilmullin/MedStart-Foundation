'use client'

import Link from 'next/link'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'
import { useLogin } from '@/hooks/useLogin'

export default function LoginPage() {
  const form = useLogin()
  const recoveryHref = form.email.trim()
    ? `/forgot-password?email=${encodeURIComponent(form.email.trim().toLowerCase())}`
    : '/forgot-password'

  return (
    <AuthShell
      eyebrow="Защищённый вход"
      title="С возвращением"
      description="Введите данные аккаунта. Сервер MedStart проверит пароль, подтверждение почты, статус профиля и роль до открытия кабинета."
      footer={
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">Ещё нет аккаунта?</span>
          <div className="flex flex-wrap gap-4 font-semibold">
            <Link href="/register/student" className="text-teal-700 hover:text-teal-900">
              Я студент
            </Link>
            <Link href="/register/tutor" className="text-violet-700 hover:text-violet-900">
              Я репетитор
            </Link>
          </div>
        </div>
      }
    >
      <form onSubmit={form.handleSubmit} className="space-y-5" noValidate>
        <label className="block space-y-2 text-sm font-semibold text-slate-700">
          Электронная почта
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="email"
            required
            disabled={form.loading}
            aria-invalid={Boolean(form.error)}
            aria-describedby={form.error ? 'login-error' : undefined}
            className={authInputClass}
            value={form.email}
            onChange={(event) => form.setEmail(event.target.value)}
            placeholder="name@example.ru"
          />
        </label>

        <PasswordField
          label="Пароль"
          value={form.password}
          onChange={form.setPassword}
          autoComplete="current-password"
          disabled={form.loading}
          errorId={form.error ? 'login-error' : undefined}
        />

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-500">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            Защищённая проверка
          </span>
          <Link href={recoveryHref} className="font-semibold text-teal-700 hover:text-teal-900">
            Не помню пароль
          </Link>
        </div>

        {form.verificationNotice && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-900"
          >
            {form.verificationNotice}
          </p>
        )}

        {form.error && (
          <p
            id="login-error"
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          >
            {form.error}
          </p>
        )}

        <button
          type="submit"
          disabled={form.loading}
          aria-busy={form.loading}
          className={authPrimaryButtonClass}
        >
          {form.loading ? (
            <>
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Проверяем аккаунт…
            </>
          ) : (
            'Войти в MedStart'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
