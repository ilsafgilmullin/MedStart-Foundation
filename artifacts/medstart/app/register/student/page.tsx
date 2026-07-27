'use client'

import Link from 'next/link'
import { GraduationCap, LoaderCircle } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'
import { PasswordRequirements } from '@/components/auth/PasswordRequirements'
import { useHydrated } from '@/hooks/useHydrated'
import { useStudentRegistration } from '@/hooks/useStudentRegistration'
import { ROUTES } from '@/lib/constants'

export default function RegisterStudentPage() {
  const form = useStudentRegistration()
  const hydrated = useHydrated()
  const disabled = form.loading || !hydrated

  return (
    <AuthShell
      eyebrow="Аккаунт студента"
      title="Начните учиться с MedStart"
      description="Создайте профиль студента. После подтверждения почты вы получите доступ к каталогу репетиторов, расписанию, сообщениям и учебным материалам."
      footer={
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href={ROUTES.LOGIN} className="font-semibold text-teal-700 hover:text-teal-900">
            Уже есть аккаунт
          </Link>
          <Link href={ROUTES.REGISTER.TUTOR} className="font-semibold text-violet-700 hover:text-violet-900">
            Зарегистрироваться как репетитор
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
        <p>Профиль студента активируется автоматически после создания аккаунта и подтверждения электронной почты.</p>
      </div>

      <form onSubmit={form.handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Имя
            <input
              autoComplete="given-name"
              required
              disabled={disabled}
              className={authInputClass}
              value={form.firstName}
              onChange={(event) => form.setFirstName(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Фамилия
            <input
              autoComplete="family-name"
              required
              disabled={disabled}
              className={authInputClass}
              value={form.lastName}
              onChange={(event) => form.setLastName(event.target.value)}
            />
          </label>
        </div>

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
            className={authInputClass}
            value={form.email}
            onChange={(event) => form.setEmail(event.target.value)}
            placeholder="name@example.ru"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Направление
            <select
              className={authInputClass}
              value={form.field}
              disabled={disabled}
              onChange={(event) => form.setField(event.target.value)}
            >
              <option value="medicine">Лечебное дело</option>
              <option value="dentistry">Стоматология</option>
              <option value="pharmacy">Фармация</option>
              <option value="nursing">Сестринское дело</option>
              <option value="other">Другое</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Курс
            <select
              className={authInputClass}
              value={form.year}
              disabled={disabled}
              onChange={(event) => form.setYear(event.target.value)}
            >
              {[1, 2, 3, 4, 5, 6].map((year) => (
                <option key={year} value={year}>
                  {year}-й курс
                </option>
              ))}
            </select>
          </label>
        </div>

        <PasswordField
          label="Придумайте пароль"
          value={form.password}
          onChange={form.setPassword}
          autoComplete="new-password"
          disabled={disabled}
          errorId={form.error ? 'student-registration-error' : undefined}
        />
        <PasswordRequirements password={form.password} />
        <PasswordField
          label="Повторите пароль"
          value={form.confirmPassword}
          onChange={form.setConfirmPassword}
          autoComplete="new-password"
          disabled={disabled}
          errorId={form.error ? 'student-registration-error' : undefined}
        />

        {!hydrated && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          >
            Подключаем защищённую регистрацию MedStart…
          </p>
        )}

        {form.error && (
          <p
            id="student-registration-error"
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          >
            {form.error}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled}
          aria-busy={form.loading}
          className={authPrimaryButtonClass}
        >
          {form.loading ? (
            <>
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Создаём защищённый аккаунт…
            </>
          ) : hydrated ? (
            'Создать аккаунт студента'
          ) : (
            'Подключаем регистрацию…'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
