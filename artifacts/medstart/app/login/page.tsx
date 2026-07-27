'use client'

import Link from 'next/link'
import { useLogin } from '@/hooks/useLogin'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:text-sm'

export default function LoginPage() {
  const form = useLogin()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="text-xl font-bold text-violet-700">
          MedStart
        </Link>
        <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Вход</h1>
          <p className="mt-2 text-slate-500">
            Войдите в свой аккаунт MedStart. Для нового аккаунта сначала
            подтвердите почту по ссылке из письма.
          </p>
          <form onSubmit={form.handleSubmit} className="mt-8 space-y-5">
            <label className="block space-y-2 text-sm font-medium">
              Электронная почта
              <input
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                value={form.email}
                onChange={(event) => form.setEmail(event.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Пароль
              <input
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
                value={form.password}
                onChange={(event) => form.setPassword(event.target.value)}
              />
            </label>
            <div className="text-right text-sm">
              <Link href="/forgot-password" className="font-medium text-violet-700">
                Не помню пароль
              </Link>
            </div>
            {form.verificationNotice && (
              <p
                role="status"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
              >
                {form.verificationNotice}
              </p>
            )}
            {form.error && (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {form.error}
              </p>
            )}
            <button
              type="submit"
              disabled={form.loading}
              aria-busy={form.loading}
              className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {form.loading ? 'Проверяем аккаунт…' : 'Войти'}
            </button>
          </form>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Если почта ещё не подтверждена, попытка входа отправит новое письмо.
            Проверьте также папку «Спам».
          </p>
          <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
            <Link href="/register/student" className="text-violet-700">
              Создать аккаунт
            </Link>
            <Link href="/register/tutor" className="text-slate-600">
              Стать репетитором
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
