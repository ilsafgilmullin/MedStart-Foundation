'use client'

import Link from 'next/link'
import { useStudentRegistration } from '@/hooks/useStudentRegistration'
import { ROUTES } from '@/lib/constants'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100'

export default function RegisterStudentPage() {
  const form = useStudentRegistration()
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <Link href={ROUTES.HOME} className="text-xl font-bold text-violet-700">
          MedStart
        </Link>
        <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Регистрация студента
          </h1>
          <p className="mt-2 text-slate-500">
            После регистрации вы сразу сможете выбирать репетиторов.
          </p>
          <form onSubmit={form.handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Имя
                <input
                  className={inputClass}
                  value={form.firstName}
                  onChange={(e) => form.setFirstName(e.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Фамилия
                <input
                  className={inputClass}
                  value={form.lastName}
                  onChange={(e) => form.setLastName(e.target.value)}
                />
              </label>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Электронная почта
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => form.setEmail(e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Направление
                <select
                  className={inputClass}
                  value={form.field}
                  onChange={(e) => form.setField(e.target.value)}
                >
                  <option value="medicine">Лечебное дело</option>
                  <option value="dentistry">Стоматология</option>
                  <option value="pharmacy">Фармация</option>
                  <option value="nursing">Сестринское дело</option>
                  <option value="other">Другое</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Курс
                <select
                  className={inputClass}
                  value={form.year}
                  onChange={(e) => form.setYear(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <option key={year} value={year}>
                      {year}-й курс
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Пароль
              <input
                type="password"
                className={inputClass}
                value={form.password}
                onChange={(e) => form.setPassword(e.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Подтвердите пароль
              <input
                type="password"
                className={inputClass}
                value={form.confirmPassword}
                onChange={(e) => form.setConfirmPassword(e.target.value)}
              />
            </label>
            {form.error && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {form.error}
              </p>
            )}
            <button
              disabled={form.loading}
              className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {form.loading ? 'Создаём аккаунт…' : 'Создать аккаунт'}
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
            <Link href={ROUTES.LOGIN} className="text-violet-700">
              Уже есть аккаунт
            </Link>
            <Link href={ROUTES.REGISTER.TUTOR} className="text-slate-600">
              Стать репетитором
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
