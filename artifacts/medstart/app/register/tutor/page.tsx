'use client'

import Link from 'next/link'
import { BadgeCheck, LoaderCircle } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'
import { PasswordRequirements } from '@/components/auth/PasswordRequirements'
import { useTutorRegistration } from '@/hooks/useTutorRegistration'
import { ROUTES } from '@/lib/constants'

export default function RegisterTutorPage() {
  const form = useTutorRegistration()

  return (
    <AuthShell
      wide
      eyebrow="Анкета репетитора"
      title="Преподавайте в MedStart"
      description="Заполните профессиональный профиль. После подтверждения почты анкета поступит на модерацию и появится в каталоге только после одобрения."
      footer={
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href={ROUTES.LOGIN} className="font-semibold text-teal-700 hover:text-teal-900">
            Уже есть аккаунт
          </Link>
          <Link href={ROUTES.REGISTER.STUDENT} className="font-semibold text-violet-700 hover:text-violet-900">
            Зарегистрироваться как студент
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
        <p>Статус нового профиля — «На проверке». Публикация, стоимость и сведения о квалификации проверяются модератором.</p>
      </div>

      <form onSubmit={form.handleSubmit} className="space-y-7" noValidate>
        <section className="space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Основные данные</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Имя *
              <input
                autoComplete="given-name"
                required
                disabled={form.loading}
                className={authInputClass}
                value={form.firstName}
                onChange={(event) => form.setFirstName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Фамилия *
              <input
                autoComplete="family-name"
                required
                disabled={form.loading}
                className={authInputClass}
                value={form.lastName}
                onChange={(event) => form.setLastName(event.target.value)}
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Электронная почта *
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="email"
              required
              disabled={form.loading}
              className={authInputClass}
              value={form.email}
              onChange={(event) => form.setEmail(event.target.value)}
              placeholder="name@example.ru"
            />
          </label>
        </section>

        <section className="space-y-5 border-t border-slate-200 pt-7">
          <h2 className="text-lg font-bold text-slate-900">Профессиональный профиль</h2>
          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Специализация *
            <input
              required
              disabled={form.loading}
              className={authInputClass}
              placeholder="Например: анатомия и физиология"
              value={form.specialization}
              onChange={(event) => form.setSpecialization(event.target.value)}
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Предметы
            <input
              disabled={form.loading}
              className={authInputClass}
              placeholder="Анатомия, физиология, биология"
              value={form.subjects}
              onChange={(event) => form.setSubjects(event.target.value)}
            />
            <span className="block text-xs font-normal text-slate-400">Перечислите через запятую.</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Учреждение
              <input
                disabled={form.loading}
                className={authInputClass}
                value={form.institution}
                onChange={(event) => form.setInstitution(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Опыт
              <input
                disabled={form.loading}
                className={authInputClass}
                placeholder="Например: 5 лет"
                value={form.experience}
                onChange={(event) => form.setExperience(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Город
              <input
                disabled={form.loading}
                className={authInputClass}
                placeholder="Например: Казань"
                value={form.city}
                onChange={(event) => form.setCity(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Стоимость занятия, ₽
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="1000000"
                step="100"
                disabled={form.loading}
                className={authInputClass}
                placeholder="1500"
                value={form.lessonPrice}
                onChange={(event) => form.setLessonPrice(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Продолжительность
              <select
                className={authInputClass}
                value={form.lessonDuration}
                disabled={form.loading}
                onChange={(event) => form.setLessonDuration(event.target.value)}
              >
                <option value="30">30 минут</option>
                <option value="45">45 минут</option>
                <option value="60">60 минут</option>
                <option value="90">90 минут</option>
                <option value="120">120 минут</option>
              </select>
            </label>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Формат занятий *</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={form.loading}
                onClick={() => form.setOnline(!form.online)}
                aria-pressed={form.online}
                className={`rounded-2xl border px-4 py-3 text-left font-semibold transition disabled:opacity-50 ${
                  form.online
                    ? 'border-teal-500 bg-teal-50 text-teal-800 ring-4 ring-teal-100'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Онлайн
              </button>
              <button
                type="button"
                disabled={form.loading}
                onClick={() => form.setInPerson(!form.inPerson)}
                aria-pressed={form.inPerson}
                className={`rounded-2xl border px-4 py-3 text-left font-semibold transition disabled:opacity-50 ${
                  form.inPerson
                    ? 'border-violet-500 bg-violet-50 text-violet-800 ring-4 ring-violet-100'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Очно
              </button>
            </div>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            О себе
            <textarea
              disabled={form.loading}
              className={`${authInputClass} min-h-32 resize-y`}
              value={form.bio}
              onChange={(event) => form.setBio(event.target.value)}
              placeholder="Расскажите об образовании, опыте и подходе к занятиям."
            />
          </label>
        </section>

        <section className="space-y-5 border-t border-slate-200 pt-7">
          <h2 className="text-lg font-bold text-slate-900">Безопасность аккаунта</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label="Пароль *"
              value={form.password}
              onChange={form.setPassword}
              autoComplete="new-password"
              disabled={form.loading}
              errorId={form.error ? 'tutor-registration-error' : undefined}
            />
            <PasswordField
              label="Повторите пароль *"
              value={form.confirmPassword}
              onChange={form.setConfirmPassword}
              autoComplete="new-password"
              disabled={form.loading}
              errorId={form.error ? 'tutor-registration-error' : undefined}
            />
          </div>
          <PasswordRequirements password={form.password} />
        </section>

        {form.error && (
          <p
            id="tutor-registration-error"
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
              Создаём защищённый профиль…
            </>
          ) : (
            'Создать профиль и отправить на проверку'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
